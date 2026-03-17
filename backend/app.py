import json
import os
import re
import uuid
import boto3
from datetime import datetime, timezone
from decimal import Decimal
from rank_bm25 import BM25Okapi

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
ADMIN_PW = os.environ.get('ADMIN_PASSWORD', 'skct-admin-2026')
RAG_BUCKET = os.environ.get('RAG_BUCKET', '')
RAG_KEY = os.environ.get('RAG_KEY', 'rag/chunks.json')

# Global cache for RAG chunks (persists across Lambda invocations)
_rag_cache = {'chunks': None, 'bm25': None, 'corpus': None}


def _korean_tokenize(text):
    """간단한 한글 토크나이저: 공백 분리 + 조사 제거"""
    text = re.sub(r'[^\w가-힣]', ' ', text)
    tokens = text.split()
    result = []
    # 한글 조사 패턴 제거 (은/는/이/가/을/를/에/의/로/와/과/도/만/까지/부터/에서)
    josa = re.compile(r'(은|는|이|가|을|를|에|의|로|와|과|도|만|까지|부터|에서|으로|라는|에는|에서는|이며|하며|하고|이다|이라|으며|하여|이고)$')
    for token in tokens:
        if len(token) < 2:
            continue
        cleaned = josa.sub('', token)
        if cleaned and len(cleaned) >= 1:
            result.append(cleaned)
    return result


def _load_rag_chunks():
    """S3에서 chunks.json 로드 (캐시)"""
    if _rag_cache['chunks'] is not None:
        return _rag_cache['chunks'], _rag_cache['bm25']

    if not RAG_BUCKET:
        return None, None

    s3 = boto3.client('s3')
    obj = s3.get_object(Bucket=RAG_BUCKET, Key=RAG_KEY)
    chunks = json.loads(obj['Body'].read().decode('utf-8'))
    _rag_cache['chunks'] = chunks

    # BM25 인덱스 구축
    corpus = [_korean_tokenize(c['text']) for c in chunks]
    _rag_cache['corpus'] = corpus
    _rag_cache['bm25'] = BM25Okapi(corpus)

    return chunks, _rag_cache['bm25']


def resp(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-User-Id',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        },
        'body': json.dumps(body, default=str),
    }


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    raise TypeError


def get_user_id(event):
    return event.get('headers', {}).get('x-user-id') or event.get('headers', {}).get('X-User-Id') or 'anonymous'


def handler(event, context):
    path = event.get('path', '')
    method = event.get('httpMethod', '')

    if method == 'OPTIONS':
        return resp(200, {})

    try:
        if path == '/api/auth/login' and method == 'POST':
            return auth_login(event)
        elif path == '/api/user-data' and method == 'GET':
            return get_user_data(event)
        elif path == '/api/user-data' and method == 'POST':
            return post_user_data(event)
        elif path == '/api/stats' and method == 'POST':
            return post_stats(event)
        elif path == '/api/stats' and method == 'GET':
            return get_stats(event)
        elif path == '/api/wrong-notes' and method == 'POST':
            return post_wrong_notes(event)
        elif path == '/api/wrong-notes' and method == 'GET':
            return get_wrong_notes(event)
        elif path == '/api/sessions' and method == 'POST':
            return post_session(event)
        elif path == '/api/feedback' and method == 'POST':
            return post_feedback(event)
        elif path == '/api/feedback' and method == 'GET':
            return get_feedback(event)
        elif path == '/api/feedback/reply' and method == 'POST':
            return reply_feedback(event)
        elif path == '/api/feedback/resolve' and method == 'POST':
            return resolve_feedback(event)
        elif path == '/api/admin/users' and method == 'GET':
            return admin_users(event)
        elif path == '/api/admin/usage' and method == 'GET':
            return admin_usage(event)
        elif path == '/api/rag/search' and method == 'POST':
            return rag_search(event)
        elif path == '/api/rag/status' and method == 'GET':
            return rag_status(event)
        else:
            return resp(404, {'error': 'Not found'})
    except Exception as e:
        print(f'Error: {e}')
        return resp(500, {'error': str(e)})


def _validate_name(name):
    """한글 실명 2~5자만 허용"""
    if not name or len(name) < 2 or len(name) > 5:
        return False
    return bool(re.match(r'^[가-힣]{2,5}$', name))


def _validate_class(class_name):
    """반 이름: 한글/영문/숫자/공백, 2자 이상, 숫자 최소 1개"""
    if not class_name or len(class_name) < 2 or len(class_name) > 20:
        return False
    return bool(re.match(r'^(?=.*\d)[가-힣a-zA-Z0-9\s]{2,20}$', class_name))


def auth_login(event):
    body = json.loads(event['body'])
    name = body.get('name', '').strip()
    class_name = body.get('className', '').strip()

    if not name or not class_name:
        return resp(400, {'error': 'name and className are required'})

    if not _validate_name(name):
        return resp(400, {'error': '한글 실명(2~5자)을 입력해주세요'})

    if not _validate_class(class_name):
        return resp(400, {'error': '올바른 반 이름을 입력해주세요 (예: Cloud 1반)'})

    # Look up by GSI1: CLASS#{className} + name
    gsi_pk = f'CLASS#{class_name}'
    result = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues={':pk': gsi_pk, ':sk': name},
    )

    items = result.get('Items', [])
    if items:
        # Existing user — login
        item = items[0]
        return resp(200, {
            'userId': item['userId'],
            'name': item['name'],
            'className': item['className'],
            'isNew': False,
        })

    # New user — register
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'PROFILE',
        'GSI1PK': gsi_pk,
        'GSI1SK': name,
        'userId': user_id,
        'name': name,
        'className': class_name,
        'createdAt': now,
    })

    return resp(200, {
        'userId': user_id,
        'name': name,
        'className': class_name,
        'isNew': True,
    })


def get_user_data(event):
    user_id = get_user_id(event)
    if user_id == 'anonymous':
        return resp(400, {'error': 'User ID required'})

    # Query all items for this user
    result = table.query(
        KeyConditionExpression='PK = :pk',
        ExpressionAttributeValues={':pk': f'USER#{user_id}'},
    )

    data = {
        'stats': {},
        'wrongNotes': [],
        'aiQuestions': [],
        'aiConfig': None,
        'preferences': {},
    }
    for item in result.get('Items', []):
        sk = item.get('SK', '')
        if sk == 'STATS':
            raw = item.get('stats', {})
            data['stats'] = json.loads(json.dumps(raw, default=decimal_default))
        elif sk == 'WRONG_NOTES':
            data['wrongNotes'] = item.get('notes', [])
        elif sk == 'AI_QUESTIONS':
            data['aiQuestions'] = item.get('questions', [])
        elif sk == 'AI_CONFIG':
            data['aiConfig'] = item.get('config', None)
        elif sk == 'PREFERENCES':
            data['preferences'] = item.get('preferences', {})

    return resp(200, data)


def post_user_data(event):
    body = json.loads(event['body'], parse_float=Decimal)
    user_id = get_user_id(event)
    if user_id == 'anonymous':
        return resp(400, {'error': 'User ID required'})

    now = datetime.now(timezone.utc).isoformat()
    pk = f'USER#{user_id}'

    if 'stats' in body and body['stats']:
        table.put_item(Item={
            'PK': pk, 'SK': 'STATS',
            'GSI1PK': 'USERS', 'GSI1SK': f'USER#{user_id}',
            'userId': user_id,
            'nickname': body.get('name', ''),
            'stats': body['stats'],
            'updatedAt': now,
        })

    if 'wrongNotes' in body:
        table.put_item(Item={
            'PK': pk, 'SK': 'WRONG_NOTES',
            'notes': body['wrongNotes'],
            'updatedAt': now,
        })

    if 'aiQuestions' in body:
        table.put_item(Item={
            'PK': pk, 'SK': 'AI_QUESTIONS',
            'questions': body['aiQuestions'],
            'updatedAt': now,
        })

    if 'aiConfig' in body and body['aiConfig']:
        table.put_item(Item={
            'PK': pk, 'SK': 'AI_CONFIG',
            'config': body['aiConfig'],
            'updatedAt': now,
        })

    if 'preferences' in body and body['preferences']:
        table.put_item(Item={
            'PK': pk, 'SK': 'PREFERENCES',
            'preferences': body['preferences'],
            'updatedAt': now,
        })

    return resp(200, {'ok': True})


def post_stats(event):
    body = json.loads(event['body'], parse_float=Decimal)
    user_id = body.get('userId', get_user_id(event))
    nickname = body.get('nickname', '')
    stats = body.get('stats', {})
    now = datetime.now(timezone.utc).isoformat()

    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'STATS',
        'GSI1PK': 'USERS',
        'GSI1SK': f'USER#{user_id}',
        'userId': user_id,
        'nickname': nickname,
        'stats': stats,
        'updatedAt': now,
    })
    return resp(200, {'ok': True})


def get_stats(event):
    user_id = get_user_id(event)
    result = table.get_item(Key={'PK': f'USER#{user_id}', 'SK': 'STATS'})
    item = result.get('Item', {})
    return resp(200, json.loads(json.dumps(item.get('stats', {}), default=decimal_default)))


def post_wrong_notes(event):
    body = json.loads(event['body'], parse_float=Decimal)
    user_id = body.get('userId', get_user_id(event))
    notes = body.get('notes', [])

    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'WRONG_NOTES',
        'notes': notes,
        'updatedAt': datetime.now(timezone.utc).isoformat(),
    })
    return resp(200, {'ok': True})


def get_wrong_notes(event):
    user_id = get_user_id(event)
    result = table.get_item(Key={'PK': f'USER#{user_id}', 'SK': 'WRONG_NOTES'})
    item = result.get('Item', {})
    return resp(200, item.get('notes', []))


def post_session(event):
    body = json.loads(event['body'], parse_float=Decimal)
    user_id = body.get('userId', get_user_id(event))
    nickname = body.get('nickname', '')
    now = datetime.now(timezone.utc).isoformat()
    session_id = f'{now}#{user_id[:8]}'

    # Save session record
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': f'SESSION#{session_id}',
        'GSI1PK': 'SESSIONS',
        'GSI1SK': now,
        'userId': user_id,
        'nickname': nickname,
        'section': body.get('section', ''),
        'type': body.get('type', ''),
        'correct': body.get('correct', 0),
        'total': body.get('total', 0),
        'duration': body.get('duration', 0),
        'createdAt': now,
    })

    # Update user last active
    table.update_item(
        Key={'PK': f'USER#{user_id}', 'SK': 'STATS'},
        UpdateExpression='SET lastActive = :la, nickname = :nn, GSI1PK = :g1pk, GSI1SK = :g1sk',
        ExpressionAttributeValues={
            ':la': now,
            ':nn': nickname,
            ':g1pk': 'USERS',
            ':g1sk': f'USER#{user_id}',
        },
    )
    return resp(200, {'ok': True})


def post_feedback(event):
    body = json.loads(event['body'])
    user_id = body.get('userId', get_user_id(event))
    now = datetime.now(timezone.utc).isoformat()
    feedback_id = f'{now}#{user_id[:8]}'

    table.put_item(Item={
        'PK': f'FEEDBACK#{feedback_id}',
        'SK': 'META',
        'GSI1PK': 'FEEDBACK',
        'GSI1SK': now,
        'id': feedback_id,
        'userId': user_id,
        'nickname': body.get('nickname', ''),
        'type': body.get('type', 'question'),
        'message': body.get('message', ''),
        'questionId': body.get('questionId', ''),
        'status': 'open',
        'adminReply': '',
        'createdAt': now,
    })
    return resp(200, {'ok': True})


def get_feedback(event):
    params = event.get('queryStringParameters') or {}
    is_all = params.get('all') == 'true'

    result = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': 'FEEDBACK'},
        ScanIndexForward=False,
        Limit=100,
    )

    items = result.get('Items', [])
    if not is_all:
        user_id = get_user_id(event)
        items = [i for i in items if i.get('userId') == user_id]

    feedback = [{
        'id': i.get('id', ''),
        'userId': i.get('userId', ''),
        'nickname': i.get('nickname', ''),
        'questionId': i.get('questionId', ''),
        'type': i.get('type', ''),
        'message': i.get('message', ''),
        'adminReply': i.get('adminReply', ''),
        'status': i.get('status', 'open'),
        'createdAt': i.get('createdAt', ''),
    } for i in items]

    return resp(200, feedback)


def reply_feedback(event):
    body = json.loads(event['body'])
    feedback_id = body.get('feedbackId', '')
    reply = body.get('reply', '')

    table.update_item(
        Key={'PK': f'FEEDBACK#{feedback_id}', 'SK': 'META'},
        UpdateExpression='SET adminReply = :r',
        ExpressionAttributeValues={':r': reply},
    )
    return resp(200, {'ok': True})


def resolve_feedback(event):
    body = json.loads(event['body'])
    feedback_id = body.get('feedbackId', '')

    table.update_item(
        Key={'PK': f'FEEDBACK#{feedback_id}', 'SK': 'META'},
        UpdateExpression='SET #s = :s',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':s': 'resolved'},
    )
    return resp(200, {'ok': True})


def admin_users(event):
    pw = event.get('queryStringParameters', {}).get('pw', '')
    if pw != ADMIN_PW:
        return resp(403, {'error': 'Unauthorized'})

    result = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': 'USERS'},
    )

    users = []
    for item in result.get('Items', []):
        uid = item.get('userId', '')
        stats = item.get('stats', {})
        total_solved = sum(s.get('total', 0) for s in stats.values()) if isinstance(stats, dict) else 0

        # Try to get name/className from PROFILE
        profile = {}
        try:
            p_result = table.get_item(Key={'PK': f'USER#{uid}', 'SK': 'PROFILE'})
            profile = p_result.get('Item', {})
        except Exception:
            pass

        users.append({
            'userId': uid,
            'nickname': profile.get('name', item.get('nickname', '')),
            'className': profile.get('className', ''),
            'totalSolved': total_solved,
            'lastActive': item.get('lastActive', item.get('updatedAt', '')),
        })

    return resp(200, {'users': json.loads(json.dumps(users, default=decimal_default))})


def admin_usage(event):
    pw = event.get('queryStringParameters', {}).get('pw', '')
    if pw != ADMIN_PW:
        return resp(403, {'error': 'Unauthorized'})

    # Get all sessions
    result = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': 'SESSIONS'},
    )
    sessions = result.get('Items', [])

    # Get users count
    users_result = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': 'USERS'},
        Select='COUNT',
    )

    by_section = {}
    total_questions = 0
    recent = {}
    for s in sessions:
        sec = s.get('section', 'unknown')
        total = int(s.get('total', 0))
        by_section[sec] = by_section.get(sec, 0) + total
        total_questions += total
        date = s.get('createdAt', '')[:10]
        if date:
            recent[date] = recent.get(date, 0) + 1

    recent_list = sorted([{'date': d, 'count': c} for d, c in recent.items()], key=lambda x: x['date'], reverse=True)[:30]

    return resp(200, json.loads(json.dumps({
        'totalUsers': users_result.get('Count', 0),
        'totalSessions': len(sessions),
        'totalQuestions': total_questions,
        'bySection': by_section,
        'recentSessions': recent_list,
    }, default=decimal_default)))


def rag_search(event):
    body = json.loads(event['body'])
    query = body.get('query', '').strip()
    section_filter = body.get('section', '')
    top_k = min(body.get('top_k', 5), 20)

    if not query:
        return resp(400, {'error': 'query is required'})

    chunks, bm25 = _load_rag_chunks()
    if chunks is None:
        return resp(503, {'error': 'RAG data not available'})

    # BM25 검색
    query_tokens = _korean_tokenize(query)
    if not query_tokens:
        return resp(400, {'error': 'No valid search tokens'})

    scores = bm25.get_scores(query_tokens)

    # 영역 필터 적용
    scored = []
    for i, score in enumerate(scores):
        if section_filter and chunks[i].get('section') != section_filter:
            continue
        scored.append((i, float(score)))

    # 상위 K개
    scored.sort(key=lambda x: x[1], reverse=True)
    results = []
    for idx, score in scored[:top_k]:
        if score <= 0:
            continue
        c = chunks[idx]
        results.append({
            'text': c['text'],
            'page': c.get('page'),
            'section': c.get('section'),
            'score': round(score, 4),
        })

    return resp(200, {'chunks': results, 'total_chunks': len(chunks)})


def rag_status(event):
    chunks, _ = _load_rag_chunks()
    if chunks is None:
        return resp(200, {'available': False, 'total_chunks': 0})

    sections = {}
    for c in chunks:
        s = c.get('section') or 'unknown'
        sections[s] = sections.get(s, 0) + 1

    return resp(200, {
        'available': True,
        'total_chunks': len(chunks),
        'sections': sections,
    })
