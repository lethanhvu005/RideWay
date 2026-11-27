import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RideWay ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="vx-container" style={{ textAlign: 'center', padding: '64px 20px' }}>
          <div className="vx-card" style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="gw-sub-pill">Thông báo hệ thống</div>
            <h2 style={{ margin: '8px 0 12px', color: 'var(--gw-dark)' }}>
              Đã xảy ra lỗi hiển thị trên trang này
            </h2>
            <p style={{ color: 'var(--gw-muted)', fontSize: 14, marginBottom: 20 }}>
              {this.state.errorMessage || 'Vui lòng tải lại trang hoặc quay về Trang chủ.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="vx-btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.href = '/';
                }}
              >
                Về trang chủ RideWay
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
