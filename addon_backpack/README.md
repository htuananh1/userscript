# Infinite Backpack Addon v1.0.0

Minecraft Bedrock addon cung cấp **kho chứa vô hạn** với hệ thống multi-page.

## ✨ Tính năng

### 🎒 Backpack Item System
- **Auto-give**: Mỗi player tự động nhận Backpack Item (chest) khi join server
- **Click để mở**: Click chu ột phải Backpack Item → Mở kho chứa
- **Không mất được**: Nếu drop hoặc mất, addon tự động give lại mỗi 5 giây
- **Không thể craft**: Item đặc biệt, không thể craft hoặc duplicate

### 📦 Multi-Page Storage
- **54 slots/page**: Mỗi page = 1 double chest (54 slots)
- **Vô hạn pages**: Có thể tạo 100+ pages = 5400+ slots!
- **Navigation dễ dàng**: Chuyển page bằng commands
- **Persistent data**: Items được lưu vào player data, không mất khi rejoin

### 🎮 Commands

| Command | Mô tả |
|---------|-------|
| `/bp` hoặc `/backpack` | Mở backpack page hiện tại |
| `/bp next` | Chuyền sang page tiếp theo |
| `/bp prev` | Quay lại page trước |
| `/bp page <số>` | Nhảy đến page cụ thể |
| `/bp info` | Xem thông tin backpack |

## 📥 Cài đặt

### Dedicated Server:
1. Copy folder `addon_backpack` vào `behavior_packs/` của server
2. Kích hoạt pack trong `valid_known_packs.json` hoặc `world_behavior_packs.json`
3. Restart server

### Single Player:
1. Nén folder `addon_backpack` thành ZIP
2. Đổi extension `.zip` → `.mcpack`
3. Double click để import vào Minecraft
4. Bật trong World Settings → Behavior Packs

## 🎯 Cách sử dụng

1. **Nhận Backpack Item**: 
   - Tự động nhận khi join server
   - Item là chest với tên §6§lBackpack

2. **Mở kho chứa**:
   - Click chuột phải vào Backpack Item
   - Hoặc dùng lệnh `/bp`

3. **Lưu trữ items**:
   - Đặt items vào inventory như bình thường
   - Đóng inventory → Items tự động lưu

4. **Chuyển page**:
   - Dùng `/bp next` để sang page mới
   - Dùng `/bp prev` để quay lại
   - Mỗi page có 54 slots riêng biệt

## ⚙️ Yêu cầu hệ thống

- **Minecraft Bedrock**: Version 1.20.0+
- **Script API**: Beta APIs enabled
- **Dependencies**: `@minecraft/server` v1.16.0-beta

## 📝 Lưu ý quan trọng

> [!WARNING]
> **Data Storage:**
> - Items được lưu trong Player Dynamic Properties
> - Nếu unload addon, data có thể bị mất
> - **Recommend**: Always backup world trước khi remove addon!

> [!IMPORTANT]
> **Backpack Item:**
> - Item này KHÔNG THỂ bị drop (auto give lại)
> - Mỗi player chỉ cần 1 backpack item
> - Data backpack lưu trong player, không phụ thuộc vào item

## 🔧 Tùy chỉnh

Bạn có thể chỉnh sửa trong `scripts/main.js`:

```javascript
const BACKPACK_ITEM_NAME = "§6§lBackpack";  // Tên item
const SLOTS_PER_PAGE = 54;                    // Slots mỗi page
```

## 🐛 Troubleshooting

**Q: Tôi mất Backpack Item!**
- A: Addon sẽ tự động give lại sau 5 giây. Hoặc dùng lệnh `/bp` để mở backpack.

**Q: Items của tôi không lưu?**
- A: Đảm bảo bạn đóng inventory trước khi leave. Items auto-save khi đóng.

**Q: Có giới hạn số pages không?**
- A: Về lý thuyết vô hạn, nhưng recommend < 100 pages để tránh lag.

**Q: Có thể share backpack với người khác không?**
- A: Không. Mỗi player có backpack riêng, data không share được.

## 📄 License

Free to use and modify.

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Item-based backpack system
- ✅ Multi-page storage (unlimited)
- ✅ Auto-give functionality
- ✅ Anti-loss protection
- ✅ Dynamic property storage
- ✅ Navigation commands
- ✅ Persistent data across sessions
