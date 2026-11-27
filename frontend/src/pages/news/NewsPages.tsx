import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetPostBySlugQuery, useGetPostsQuery } from '../../services/ridewayApi';

export function NewsListPage() {
  const { data: posts = [], isLoading } = useGetPostsQuery();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', ...Array.from(new Set(posts.map((p) => p.category)))];
  const filtered =
    selectedCategory === 'ALL' ? posts : posts.filter((p) => p.category === selectedCategory);

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Cẩm nang & Tin tức du lịch (/tin-tuc)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 38px)', margin: '8px 0', color: '#fff' }}>
            Tin tức tuyến xe & Kinh nghiệm di chuyển Xuyên Việt
          </h1>
          <p style={{ maxWidth: 660, color: '#dbeafe', margin: 0 }}>
            Tổng hợp kinh nghiệm chọn phòng đôi Limousine 2 tầng, bí quyết đặt vé theo chặng tiết kiệm và cẩm nang khám phá các điểm đến dọc Việt Nam.
          </p>
        </div>
      </section>

      <section className="gw-section">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={selectedCategory === cat ? 'vx-btn-primary' : 'vx-btn-outline'}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'ALL' ? 'Tất cả chuyên mục' : cat}
            </button>
          ))}
        </div>

        {isLoading && <div className="vx-card">Đang tải danh sách bài viết từ `/api/v1/posts`…</div>}

        <div className="vx-grid-3">
          {filtered.map((p, idx) => (
            <article key={p.id} className="gw-tour-card">
              <div
                className="gw-tour-img"
                style={{
                  backgroundImage: `url(${
                    idx % 2 === 0
                      ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
                      : 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80'
                  })`,
                }}
              >
                <span className="gw-tour-badge-left" style={{ background: 'var(--gw-green)' }}>
                  {p.category}
                </span>
              </div>
              <div className="gw-tour-body">
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 6 }}>
                    📅 {p.published_at ? new Date(p.published_at).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                  </div>
                  <h2 style={{ margin: '0 0 10px', fontSize: 18.5, color: 'var(--gw-dark)' }}>{p.title}</h2>
                  <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gw-muted)' }}>{p.summary}</p>
                </div>
                <Link to={`/tin-tuc/${p.slug}`} className="vx-btn-outline" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Đọc bài viết chi tiết ➜
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NewsDetailPage() {
  const { slug = '' } = useParams();
  const { data: post, isLoading, error } = useGetPostBySlugQuery(slug, { skip: !slug });
  const { data: allPosts = [] } = useGetPostsQuery();

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/tin-tuc" style={{ color: 'var(--gw-green)' }}>Tin tức & Cẩm nang</Link> /{' '}
        <span>{post?.title || slug}</span>
      </div>

      {isLoading && <div className="vx-card">Đang tải nội dung bài viết…</div>}
      {error && (
        <div className="vx-card" style={{ color: 'var(--gw-danger)', fontWeight: 700 }}>
          Không tìm thấy bài viết ({slug}).
        </div>
      )}

      {post && (
        <div className="gw-split-2">
          <article className="vx-card">
            <span className="vx-badge vx-badge-green">{post.category}</span>
            <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(22px, 2.8vw, 32px)', color: 'var(--gw-dark)' }}>
              {post.title}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 18 }}>
              Ban biên tập Vé Xuyên Việt – RideWay •{' '}
              {post.published_at ? new Date(post.published_at).toLocaleDateString('vi-VN') : ''}
            </div>

            <div
              style={{
                height: 280,
                borderRadius: 14,
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: 20,
              }}
            />

            <p style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--gw-dark)', lineHeight: 1.7 }}>
              {post.summary}
            </p>
            <div style={{ fontSize: 15, color: 'var(--gw-text)', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
              {post.body}
            </div>
          </article>

          <aside style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
            <div className="vx-card" style={{ background: 'var(--gw-green-light)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Đặt vé xe Limousine 2 tầng</h3>
              <p style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
                Áp dụng ngay kinh nghiệm chọn phòng đôi và đặt vé theo đoạn chặng cho chuyến đi sắp tới của bạn.
              </p>
              <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Tìm chuyến & Chọn chỗ ➜
              </Link>
            </div>

            <div className="vx-card">
              <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Bài viết liên quan</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {allPosts
                  .filter((p) => p.slug !== slug)
                  .map((p) => (
                    <Link
                      key={p.id}
                      to={`/tin-tuc/${p.slug}`}
                      style={{
                        textDecoration: 'none',
                        color: 'var(--gw-dark)',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--gw-border)',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {p.title}
                    </Link>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
