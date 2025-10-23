export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const path = url.pathname.replace('/api', '');

  // 환경 변수에서 API URL 가져오기
  const config = useRuntimeConfig();
  const apiUrl =
    config.public.apiUrl || process.env.API_URL || 'http://localhost:3001';
  const targetUrl = `${apiUrl}${path}`;

  // 쿼리 파라미터와 헤더를 전달
  const query = getQuery(event);
  const headers = getHeaders(event);

  // CORS 헤더 추가
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.node.req.method === 'OPTIONS') {
    setHeaders(event, corsHeaders);
    return '';
  }

  // POST, PUT 등의 경우 body도 전달
  let body;
  if (event.node.req.method !== 'GET' && event.node.req.method !== 'HEAD') {
    try {
      body = await readBody(event);
    } catch (error: any) {
      console.error('body 읽기 실패:', error);
      // body 읽기 실패 시 빈 객체로 처리
      body = {};
    }
  }

  try {
    const response = await $fetch(targetUrl, {
      method: event.node.req.method as
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'DELETE'
        | 'OPTIONS',
      query,
      headers: {
        ...headers,
        // Authorization 헤더가 있으면 전달
        ...(headers.authorization && { authorization: headers.authorization }),
      },
      body,
    });

    // CORS 헤더 추가하여 응답
    setHeaders(event, corsHeaders);
    return response;
  } catch (error: unknown) {
    console.error('API 프록시 오류:', (error as any).message);

    // CORS 헤더 추가
    setHeaders(event, corsHeaders);

    throw createError({
      statusCode: (error as any).statusCode || 500,
      statusMessage:
        (error as any).statusMessage || 'API 요청 중 오류가 발생했습니다.',
    });
  }
});
