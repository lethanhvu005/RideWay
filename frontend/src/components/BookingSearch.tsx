import { useState } from 'react';

export type VehicleFilter = 'ALL' | 'LIMO' | 'SLEEPER';
export interface SearchLocation { id: string; name: string; province: string }
export interface SearchValues { from: string; to: string; date: string; vehicle: VehicleFilter }
export function TravelIcon({ kind }: { kind: 'bus' | 'pin' | 'calendar' | 'swap' | 'bed' | 'check' }) {
  const paths = { bus: 'M5 16V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11H5Zm0-6h14M7 19v2m10-2v2M8 13h.01M16 13h.01M5 16v3h14v-3', pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6', calendar: 'M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16M8 14h3v3H8Z', swap: 'M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4', bed: 'M3 19V6m0 10h18v3M3 10h6v6m0-6h9a3 3 0 0 1 3 3v3', check: 'm5 12 4 4L19 6' };
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
export function BookingSearch({ locations, values, onChange, onSearch, loading }: { locations: SearchLocation[]; values: SearchValues; onChange: (v: SearchValues) => void; onSearch: (v: SearchValues) => void; loading: boolean }) {
  const [error, setError] = useState('');
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return <section className="rw-search-hero" id="top">
    <div className="rw-hero-heading"><span>VÉ XUYÊN VIỆT · ĐỒNG HÀNH CÙNG BẠN</span><h1>Chọn chuyến xe. Bắt đầu hành trình.</h1><p>Đi muôn nơi, an tâm trên từng chặng đường.</p></div>
    <div className="rw-search-panel">
      <div className="rw-search-tabs"><span className="rw-search-caption"><span className="rw-green-dot" /> Đặt vé trực tuyến</span>
        {([{value:'ALL',label:'Xe khách',icon:'bus'},{value:'LIMO',label:'Limousine',icon:'bus'},{value:'SLEEPER',label:'Giường nằm',icon:'bed'}] as const).map(tab=><button key={tab.value} type="button" aria-pressed={values.vehicle===tab.value} onClick={()=>onChange({...values,vehicle:tab.value})}><TravelIcon kind={tab.icon}/>{tab.label}</button>)}
      </div>
      <form onSubmit={e=>{e.preventDefault();if(values.from && values.from===values.to){setError('Vui lòng chọn điểm đến khác điểm xuất phát.');return;}if(values.date && values.date<minDate){setError('Vui lòng chọn ngày đi từ hôm nay.');return;}setError('');onSearch(values);}}>
        <div className="rw-search-row"><div className="rw-fields">
          <div className="rw-location rw-origin"><TravelIcon kind="pin"/><div><label htmlFor="rw-origin">Nơi xuất phát</label><select id="rw-origin" value={values.from} onChange={e=>onChange({...values,from:e.target.value})}><option value="">Chọn điểm đi</option>{locations.map(l=><option key={l.id} value={l.id}>{l.province} · {l.name}</option>)}</select></div>
          <button type="button" className="rw-swap" aria-label="Đổi điểm đi và điểm đến" onClick={()=>{onChange({...values,from:values.to,to:values.from});setError('');}}><TravelIcon kind="swap"/></button></div>
          <div className="rw-location rw-arrival"><TravelIcon kind="pin"/><div><label htmlFor="rw-arrival">Nơi đến</label><select id="rw-arrival" value={values.to} onChange={e=>onChange({...values,to:e.target.value})}><option value="">Chọn điểm đến</option>{locations.map(l=><option key={l.id} value={l.id}>{l.province} · {l.name}</option>)}</select></div></div>
          <div className="rw-location rw-date"><TravelIcon kind="calendar"/><div><label htmlFor="rw-date">Ngày đi</label><input id="rw-date" aria-label="Ngày đi" type="date" min={minDate} value={values.date} onChange={e=>onChange({...values,date:e.target.value})}/></div></div>
        </div><button className="rw-search-submit" disabled={loading}>{loading?'Đang tìm…':'Tìm kiếm'}</button></div>
        {error&&<p className="rw-search-error" role="alert">{error}</p>}
        <div className="rw-search-foot"><span>Vé một chiều · Chọn chỗ trực tiếp trên sơ đồ</span><a href="#booking-map">Xem sơ đồ xe</a></div>
      </form>
    </div>
    <div className="rw-trust-strip">{['Chủ động chọn chỗ','Giá vé rõ ràng','Giữ chỗ 10 phút','Thanh toán VNPay'].map(t=><span key={t}><TravelIcon kind="check"/>{t}</span>)}</div>
  </section>;
}
