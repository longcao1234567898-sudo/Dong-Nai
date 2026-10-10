/** Khung dùng chung cho các trang quản trị. */
export const TieuDeQt = ({ tieuDe, moTa }: { tieuDe: string; moTa: string }) => (
  <div className="mb-4"><h1 className="text-[22px] font-extrabold">{tieuDe}</h1><p className="text-sm text-slate-500">{moTa}</p></div>);
export const The = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</div>);
export const o = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900';
export const nhan = 'mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200';
export const nutChinh = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700 disabled:opacity-60';
export const nutVien = 'inline-flex min-h-[34px] items-center rounded-lg border border-slate-200 px-2.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800';
export const The_nho = ({ mau, children }: { mau: 'xanh' | 'vang' | 'xam'; children: React.ReactNode }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11.5px] font-bold ${{ xanh: 'bg-primary-100 text-primary-700', vang: 'bg-amber-100 text-amber-800', xam: 'bg-slate-100 text-slate-500 dark:bg-slate-800' }[mau]}`}>{children}</span>);
