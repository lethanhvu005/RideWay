"""Serve the built SPA; API and static paths never fall back to HTML."""
from django.conf import settings
from django.http import FileResponse, Http404
from django.views.decorators.http import require_GET


@require_GET
def frontend(request):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.is_file():
        raise Http404('Frontend build is not available.')
    response = FileResponse(index.open('rb'), content_type='text/html')
    response['Cache-Control'] = 'no-cache'
    return response
