---
name: monthly-seo-report
description: >
  Tao bao cao SEO hang thang dang HTML cho SAMCO Tech (samcotech.com.vn) va
  Mang Thanh Cong (mangthanhcong.vn). Dung khi user noi: lam bao cao thang,
  tao report SEO, bao cao cho khach, tong ket thang. Output: 1 file HTML
  co floating nav, CSS charts, scroll table, noindex.
---

# Monthly SEO Report Skill

## Thông tin dự án

### SAMCO Tech (samcotech.com.vn)
- GSC: `https://samcotech.com.vn`
- Logo: `https://samcotech.com.vn/wp-content/uploads/2025/10/Samco-ngang-chuan-scaled.png`
- Màu chủ: Burgundy `#7A1F3C`, nền `#FAF3EF`
- Target blog/tháng: 30 bài
- Có WooCommerce (sản phẩm)

### Mạng Thành Công (mangthanhcong.vn)
- GSC: `https://mangthanhcong.vn`
- Màu chủ: xác nhận với user lần đầu
- Không có WooCommerce

---

## Quy trình

### Bước 1 — Thu thập data

- **GSC**: tháng hiện tại + tháng trước để so sánh (dimensions: date, sort ascending)
- **WordPress**: bài viết publish + draft trong tháng
- **WooCommerce** (chỉ SAMCO): sản phẩm mới + cập nhật, tổng SP
- **Keywords CSV** (nếu user upload): bỏ brand KW, sort by rank, lấy top 300

### Bước 2 — Tính số liệu

```
CTR = SUM(clicks) / SUM(impressions) * 100
Vị trí TB = SUM(position * impressions) / SUM(impressions)
```

Luôn so sánh vs tháng trước: clicks, impressions, CTR, vị trí, blog, SP.

### Bước 3 — Build HTML

Cấu trúc chuẩn:
```html
<head>
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="googlebot" content="noindex, nofollow">
  CSS: variables màu dự án, body, topbar, content, sections, cards, tables, nav
</head>
<body>
  #samco-nav  → floating nav, position:fixed, left:20px, top:50%, z-index:99999
  .topbar     → sticky, logo + title + chips
  .content    → padding-left:210px
    Section 1: Tổng quan (hero + growth cards + CSS charts)
    Section 2: SP mới (SAMCO) hoặc nội dung mới (Mạng TC)
    Section 3: SP cập nhật (SAMCO)
    Section 4: SEO Audit (CSS progress bars)
    Section 5: Blog (bảng + CSS chart phân bổ)
    Section 6: GSC (cards + CSS charts ngày thực)
    Section 7: Keywords (scroll table max-height:680px)
    Section 8: Kế hoạch (3 cột ưu tiên)
  JS: scrollToSec + active nav + scroll top button
</body>
```

---

## Quy tắc kỹ thuật quan trọng

### Floating Nav — KHÔNG được sai
```html
<!-- Đặt NGAY SAU <body>, KHÔNG trong div nào -->
<nav id="samco-nav">...</nav>
```
```css
#samco-nav {
  position: fixed;
  left: 20px; top: 50%;
  transform: translateY(-50%);
  z-index: 99999;
  background: rgba(255,255,255,0.90);
  backdrop-filter: blur(16px);
}
```
```js
// Dùng data-sec + addEventListener, KHÔNG onclick=""
item.addEventListener('click', function() {
  var el = document.getElementById(this.getAttribute('data-sec'));
  window.scrollTo({top: el.getBoundingClientRect().top + pageYOffset - 70, behavior:'smooth'});
});
```

### Charts — LUÔN dùng CSS/SVG, KHÔNG canvas
Canvas lỗi khi section ẩn. Thay bằng:
```html
<!-- Bar chart CSS -->
<div style="display:flex;align-items:flex-end;height:140px;gap:1px">
  <!-- mỗi cột: -->
  <div style="flex:1;height:X%;background:#7A1F3C;border-radius:2px 2px 0 0"
       title="Ngày N: Y clicks"></div>
</div>

<!-- Donut chart SVG -->
<svg viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="15.9" fill="none" stroke="color"
          stroke-dasharray="PCT REST" stroke-dashoffset="OFFSET"/>
</svg>

<!-- Horizontal bar CSS -->
<div style="flex:1;background:color;border-radius:6px;height:22px;width:PCT%"></div>
```

### Bảng Keywords (scroll)
```html
<div style="border:1px solid #E8D5CC;border-radius:12px;overflow:hidden">
  <table><!-- thead cố định --></table>
  <div style="max-height:680px;overflow-y:auto;scrollbar-width:thin">
    <table><tbody><!-- 300 rows --></tbody></table>
  </div>
</div>
```

### Màu badge TOP
- TOP 1: `background:#D1FAE5;color:#065F46`
- TOP 2-3: `background:#DBEAFE;color:#1E40AF`
- TOP 4-5: `background:#FEF3C7;color:#92400E`

---

## Section Kế hoạch — Format chuẩn (3 cột)

```
Ưu tiên 1 [đỏ] — Cải thiện nhóm yếu
  [3 card ngang]: tên nhóm + badge rank + việc cần làm + danh sách SP

Ưu tiên 2 [cam] — Fix tồn đọng
  [3 card ngang]: tên + mô tả + số lượng

Ưu tiên 3 [xanh] — X bài blog mới
  phân bổ nhánh + loại content

Ưu tiên 4 — Kỹ thuật/Internal Link
```

---

## Checklist trước khi xuất file

- [ ] noindex meta tag trong head
- [ ] Logo dự án: topbar + nav footer + hero
- [ ] Nav: position:fixed, z-index:99999, ngay sau body
- [ ] Nav click: data-sec + addEventListener
- [ ] Tất cả charts: CSS/SVG (không canvas)
- [ ] Số liệu khớp: Clicks, CTR, SP, Blog
- [ ] Keywords: scroll max-height, thead cố định
- [ ] Content padding-left >= 200px
- [ ] File tự chứa, đóng body+html đúng

---

## Lỗi thường gặp

| Lỗi | Fix |
|-----|-----|
| Nav sai vị trí | Đặt nav ngay sau body, không trong div |
| Chart trống | Dùng CSS div thay canvas |
| Nav không click | Dùng data-sec + addEventListener |
| Bảng KW dài | Wrap tbody trong div max-height:680px |
| CTR lệch | CTR = SUM(clicks)/SUM(impressions)*100 |

---

## Tóm tắt text ngắn gọn cho khách

Sau khi làm xong HTML, tạo thêm text tóm tắt gửi khách (ngắn gọn, ý chính):

```
TÓM TẮT THÁNG X/YYYY — [Dự án]

Tổng SP: X (+Y so với tháng trước)

Thêm mới & cập nhật:
- Thêm X SP: [nhóm (số)]
- Cập nhật Y SP: [loại]

SEO: [% hoàn thành theo nhóm]
Blog: X bài — Y% target, phân bổ đều Z bài/ngày
GSC: Clicks X (+Y%) · CTR Z% (+W%) · Impressions A (+B%)

---
KẾ HOẠCH THÁNG [X+1]

Ưu tiên 1 — [tên]: [mô tả ngắn]
  SP: [danh sách]
Ưu tiên 2 — [tên]: [mô tả ngắn]
Ưu tiên 3 — X bài blog: [phân bổ]
Target: CTR X%+ · Clicks Y,000+
```
