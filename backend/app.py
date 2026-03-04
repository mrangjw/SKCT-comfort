import json
import os
import boto3
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
ADMIN_PW = os.environ.get('ADMIN_PASSWORD', 'skct-admin-2026')


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
        if path == '/api/stats' and method == 'POST':
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
        else:
            return resp(404, {'error': 'Not found'})
    except Exception as e:
        print(f'Error: {e}')
        return resp(500, {'error': str(e)})


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
        users.append({
            'userId': uid,
            'nickname': item.get('nickname', ''),
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
