# ⚠️ TROUBLESHOOTING - Addon Không Hoạt Động

## Vấn đề: Addon không load, không nhận items

### ✅ GIẢI PHÁP:

## 1️⃣ **Enable Beta APIs (QUAN TRỌNG NHẤT!)**

Addon này cần **Beta APIs** để hoạt động!

### Trên Mobile/Pocket Edition:
1. Mở **World Settings**
2. Scroll xuống phần **Experiments**  
3. Bật **Beta APIs** ✅
4. Restart world

### Trên PC/Windows 10:
1. Edit World
2. Game → Experiments
3. Enable "Beta APIs" ✅
4. Confirm và restart

---

## 2️⃣ Kiểm tra Addon đã cài đúng chưa

### Dedicated Server:
```
behavior_packs/
└── addon_backpack/
    ├── manifest.json
    ├── pack_icon.png
    ├── README.md
    └── scripts/
        └── main.js
```

### Single Player:
1. Zip folder `addon_backpack`
2. Đổi đuôi `.zip` → `.mcpack`
3. Double click import
4. World Settings → Behavior Packs → Move vào Active

---

## 3️⃣ Kiểm tra Console Errors

Nếu vẫn không hoạt động:

### Trên Mobile:
- Không có console, nhưng check xem có message nào khi join không

### Trên PC:
- Check content log file
- Xem có error message gì

---

## 4️⃣ Test đơn giản

1. Join world với addon enabled
2. Mở chat - có thấy message:
   ```
   [BACKPACK] Infinite Backpack Addon v1.1.0 đã kích hoạt!
   ```
3. Nếu KHÔNG thấy → Addon chưa load

---

## 5️⃣ Nguyên nhân thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| ❌ Beta APIs chưa bật | Enable trong Experiments |
| ❌ Addon không active | Check Behavior Packs list |
| ❌ Sai version Minecraft | Cần 1.20.0+ |
| ❌ File structure sai | Check folder structure |
| ❌ Dependencies thiếu | Manifest cần @minecraft/server |

---

## 📱 Đặc biệt cho Mobile:

- **Bắt buộc**: Beta APIs PHẢI được bật
- **Permissions**: Đảm bảo Minecraft có quyền storage
- **Memory**: Clear cache nếu lag

---

## 🔧 Quick Fix:

1. **Delete world** (backup trước!)
2. **Create new world**  
3. **Enable Beta APIs TRƯỚC**
4. **Add addon**
5. **Create world**

---

## ❓ Vẫn không hoạt động?

Gửi info sau:
- Platform: Mobile/PC?
- Minecraft version: ?
- Beta APIs enabled: Yes/No?
- Error message nào có thấy không?
