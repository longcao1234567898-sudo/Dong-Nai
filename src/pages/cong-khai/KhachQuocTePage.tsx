/**
 * Hướng dẫn cho khách nước ngoài — song ngữ, nội dung tĩnh.
 *
 * Gắn với bảng 9 của phụ lục: "quá hạn tạm trú" và vi phạm xuất nhập cảnh là
 * các vi phạm hay gặp của khách nước ngoài. Nói trước cho khách biết thì đỡ
 * phải xử lý sau. Chỉ tóm tắt để tham khảo, không thay văn bản pháp luật.
 */
import { Link } from 'react-router-dom';
import { Home, CalendarClock, Mountain, IdCard, Phone, BadgeDollarSign, Info } from 'lucide-react';
import { useNN } from '../../i18n/NgonNgu';

const MUC: { ic: typeof Home; vi: [string, string]; en: [string, string] }[] = [
  { ic: Home,
    vi: ['Khai báo tạm trú', 'Nơi bạn lưu trú — khách sạn, resort, homestay hay nhà dân — có trách nhiệm khai báo tạm trú cho bạn với công an xã, phường nơi đó, trong vòng 12 giờ kể từ khi bạn đến (24 giờ ở vùng sâu, vùng xa). Hãy xuất trình hộ chiếu khi nhận phòng. Nếu ở nhà người quen, nhắc chủ nhà khai báo.'],
    en: ['Temporary residence registration', 'Wherever you stay — hotel, resort, homestay or a private home — the host must register your temporary residence with the local commune/ward police within 12 hours of your arrival (24 hours in remote areas). Show your passport at check-in. If you stay with friends, remind your host to register you.'] },
  { ic: CalendarClock,
    vi: ['Ở đúng thời hạn được phép', 'Chỉ lưu trú trong thời hạn của thị thực hoặc thời hạn tạm trú được cấp. Ở quá hạn là vi phạm và có thể bị xử phạt. Cần ở thêm thì làm thủ tục gia hạn trước khi hết hạn.'],
    en: ['Stay within your permitted period', 'Only stay within the validity of your visa or granted stay. Overstaying is a violation and can be penalised. If you need more time, apply for an extension before it expires.'] },
  { ic: Mountain,
    vi: ['Khu vực biên giới', 'Phía bắc thành phố giáp Campuchia; một số xã thuộc khu vực biên giới, người nước ngoài vào cần được cơ quan công an cho phép. Trước khi đến các điểm gần biên giới như Vườn quốc gia Bù Gia Mập, thác Đắk Mai, hãy hỏi nơi lưu trú hoặc công an xã.'],
    en: ['Border areas', 'The north of the city borders Cambodia; some communes are border zones that foreigners may enter only with police permission. Before visiting places near the border such as Bu Gia Map National Park or Dak Mai Waterfall, ask your accommodation or the commune police.'] },
  { ic: IdCard,
    vi: ['Mang theo giấy tờ', 'Luôn mang theo hộ chiếu, hoặc bản sao trang thông tin và thị thực, khi đi lại.'],
    en: ['Carry your documents', 'Always carry your passport, or a copy of the photo page and visa, when travelling around.'] },
  { ic: BadgeDollarSign,
    vi: ['Tránh bị nâng giá', 'Hỏi rõ giá trước khi dùng dịch vụ (thuê xe, thuyền, ăn uống). Gặp chặt chém, hãy gửi phản ánh để cán bộ địa phương kiểm tra, xử lý.'],
    en: ['Avoid overcharging', 'Agree on the price before using a service (vehicle or boat rental, food). If you are overcharged, send a report so local officials can look into it.'] },
];

export default function KhachQuocTePage() {
  const { nn, t } = useNN();
  return (
    <section className="animate-page container-page max-w-4xl py-8">
      <h1 className="text-2xl font-extrabold">{t('khachQuocTe')}</h1>
      <p className="text-sm text-slate-500">{nn === 'en' ? 'Welcome to Dong Nai! A few rules worth knowing to make your trip smooth.' : 'Chào mừng bạn đến Đồng Nai! Vài quy định nên biết để chuyến đi suôn sẻ.'}</p>
      <div className="mt-5 space-y-3">{MUC.map(({ ic: Ic, vi, en }) => { const [tieuDe, noiDung] = nn === 'en' ? en : vi; return (
        <div key={vi[0]} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-slate-800 dark:text-primary-400"><Ic className="h-5 w-5" /></span>
          <div><h2 className="font-bold">{tieuDe}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{noiDung}</p></div>
        </div>); })}</div>
      <div className="mt-5 rounded-2xl bg-red-50 p-5 text-red-900 dark:bg-red-900/30 dark:text-red-100">
        <h2 className="flex items-center gap-2 font-bold"><Phone className="h-5 w-5" />{nn === 'en' ? 'Emergency' : 'Khẩn cấp'}</h2>
        <p className="mt-1 text-sm">{t('khanCap')}</p>
        <p className="mt-2 text-sm"><Link to="/phan-anh" className="font-bold underline">{t('phanAnhTieuDe')} →</Link></p>
      </div>
      <p className="mt-5 flex gap-2 text-xs text-slate-500"><Info className="h-4 w-4 shrink-0" />{nn === 'en'
        ? 'Summary for reference only. The binding rules are Vietnam’s Law on Entry, Exit, Transit and Residence of Foreigners (Law No. 47/2014/QH13, as amended in 2019 and 2023) and guidance from the immigration authorities.'
        : 'Tóm tắt để tham khảo. Quy định chính thức theo Luật Nhập cảnh, xuất cảnh, quá cảnh, cư trú của người nước ngoài tại Việt Nam (Luật số 47/2014/QH13, sửa đổi, bổ sung năm 2019 và 2023) và hướng dẫn của cơ quan quản lý xuất nhập cảnh.'}</p>
    </section>);
}
