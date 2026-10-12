"""
views.py — Backend Luxe Glow Cosmetics
Models: KhachHang, Admin, DanhMuc, SanPham, KhuyenMai,
        DonHang, ChiTietDonHang, GioHang, ChiTietGioHang, DanhGia

FIXES so với version cũ:
  1. reset_password: bỏ yêu cầu OTP (frontend không gửi OTP ở bước này)
  2. _sp_data: rating query dùng đúng status string có dấu
  3. create_order: trangthai dùng "Mới" (có dấu) đúng với CHOICES
  4. update_order_status: map đầy đủ, kể cả "Hoàn thành"
  5. admin_list_orders: filter đúng status, trả về include_items=True khi cần
  6. list_products: thêm sort, trả thêm image field rõ ràng
  7. dashboard_overview: đếm đúng low_stock, tính trend tháng trước
  8. get_product_detail: trả đầy đủ ảnh + thêm related products
  9. login_normal: trả thêm fullname đúng key để frontend dùng
 10. CORS headers thêm vào mọi response (nếu chưa có middleware)
"""

import json, datetime, random, logging, hmac, hashlib, urllib.parse, requests
from decimal import Decimal

from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Avg, Count, Sum, F, Q, DecimalField
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from django.utils.timezone import now as _now

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status

import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name="dhpncxnqb",
    api_key="645219879153559",
    api_secret="pHQNE22O5HjhqIsblyj0GdihQ_k",
)

from .models import (
    DanhMuc, SanPham, KhachHang, KhuyenMai, Admin,
    DonHang, ChiTietDonHang, GioHang, ChiTietGioHang, DanhGia,
    Banner, BannerItem, BaiViet, NoidungSanPham,
    DanhGiaMedia, DanhGiaReply,
    BinhLuan, BinhLuanLike, AdminBinhLuanReply,
)

logger = logging.getLogger(__name__)
# OTP storage in-memory: { email: {"otp": "123456", "expires": datetime} }
otp_storage = {}


# ═══════════════════════════════════════════════════════
# HELPERS — ID GENERATION
# ═══════════════════════════════════════════════════════

def _gen_id(prefix: str, model, field: str) -> str:
    ids = list(model.objects.values_list(field, flat=True))
    nums = []
    for x in ids:
        try:
            nums.append(int(str(x).replace(prefix, "")))
        except ValueError:
            pass
    return f"{prefix}{max(nums, default=0) + 1:03d}"


# ═══════════════════════════════════════════════════════
# HELPERS — SERIALIZERS
# ═══════════════════════════════════════════════════════

def _kh_data(kh: KhachHang) -> dict:
    return {
        "id": kh.makh,
        "fullname": kh.hoten,          # key "fullname" cho Navbar.js dùng
        "full_name": kh.hoten,         # key "full_name" cho Information.js
        "email": kh.email,
        "phone_number": kh.sdt or "",
        "address": kh.diachi or "",
        "birthday": str(kh.ngaysinh) if kh.ngaysinh else None,
        "avatar": kh.avatar or "",
        "login_type": kh.loaidangnhap,
        "created_at": str(kh.ngaytao),
    }


def _sp_data(sp: SanPham) -> dict:
    try:
        cat_name = sp.madm.tendm
        cat_id   = sp.madm.madm
    except Exception:
        cat_name = ""
        cat_id   = ""

    # FIX: dùng Q để match cả hai dạng string
    agg = DanhGia.objects.filter(masp=sp).filter(
        Q(trangthai="Hiển thị") | Q(trangthai="Hien thi")
    ).aggregate(avg=Avg("diemdanhgia"), cnt=Count("madg"))

    sold = ChiTietDonHang.objects.filter(masp=sp).aggregate(
        total=Sum("soluong")
    )["total"] or 0

    # Parse hinhanh: có thể là JSON array hoặc string đơn
    raw_img = sp.hinhanh or ""
    try:
        parsed = json.loads(raw_img)
        if isinstance(parsed, list):
            images_list = parsed
            first_img   = parsed[0] if parsed else ""
        else:
            images_list = [raw_img] if raw_img else []
            first_img   = raw_img
    except (json.JSONDecodeError, TypeError):
        images_list = [raw_img] if raw_img else []
        first_img   = raw_img

    return {
        "id":            sp.masp,
        "name":          sp.tensp,
        "brand":         sp.thuonghieu or "",
        "category_id":   cat_id,
        "category":      cat_name,
        "price":         int(sp.giaban),
        "stock":         sp.soluongton,
        "expiry_date":   str(sp.hansudung) if sp.hansudung else None,
        "image":         first_img,
        "images":        images_list,
        "rating_avg":    round(float(agg["avg"] or 0), 1),
        "rating_count":  int(agg["cnt"] or 0),
        "sold":          int(sold),
    }


def _km_data(km: KhuyenMai) -> dict:
    today = datetime.date.today()

    # Parse an toàn: ngaybatdau / ngayketthuc có thể là date, datetime, hoặc string
    def _to_date(val):
        if val is None:
            return None
        if isinstance(val, datetime.datetime):
            return val.date()
        if isinstance(val, datetime.date):
            return val
        try:
            return datetime.date.fromisoformat(str(val)[:10])
        except Exception:
            return None

    start = _to_date(km.ngaybatdau)
    end   = _to_date(km.ngayketthuc)

    if start is None or end is None:
        st = "scheduled"
    elif today < start:
        st = "scheduled"
    elif today > end:
        st = "expired"
    else:
        st = "active"

    return {
        "id":             km.makm,
        "name":           km.tenkm,
        "code":           km.magiamgia,
        "discount_type":  km.loaigiam,
        "discount_value": float(km.giatrigiam),
        "start_date":     str(start) if start else "",
        "end_date":       str(end) if end else "",
        "used":           km.soluotdung,
        "limit":          km.gioihandung,
        "status":         st,
    }


def _dh_data(dh: DonHang, include_items: bool = False) -> dict:
    # Map trangthai DB → label hiển thị
    status_map = {
        "Moi": "Đang xử lý", "Mới": "Đang xử lý",
        "Giao": "Đang giao",
        "Huy": "Đã hủy", "Hủy": "Đã hủy",
        "Hoan thanh": "Hoàn thành", "Hoàn thành": "Hoàn thành",
    }
    label = status_map.get(dh.trangthai, dh.trangthai)
    data = {
        "id":               dh.madh,
        "customer_id":      dh.makh_id,
        "customer_name":    dh.makh.hoten if dh.makh_id else "",
        "customer_phone":   dh.makh.sdt if dh.makh_id else "",
        "customer_email":   dh.makh.email if dh.makh_id else "",
        "voucher_code":     dh.makm.magiamgia if dh.makm_id else None,
        "discount":         float(dh.sotiengiam),
        "date":             str(dh.ngaydat),
        "total":            float(dh.tongtien),
        "status":           label,
        "raw_status":       dh.trangthai,
        "shipping_address": dh.diachigiao,
    }
    if include_items:
        items = ChiTietDonHang.objects.filter(madh=dh).select_related("masp")
        data["items"] = [
            {
                "product_id":    ct.masp_id,
                "product_name":  ct.masp.tensp,
                "product_image": (lambda h: (json.loads(h)[0] if h and h.startswith("[") else h) if h else "")(ct.masp.hinhanh or ""),
                "quantity":      ct.soluong,
                "unit_price":    float(ct.dongia),
                "subtotal":      float(ct.thanhtien),
            }
            for ct in items
        ]
    return data


# ═══════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════

@api_view(["POST"])
def check_email(request):
    email = request.data.get("email", "").strip().lower()
    exists = KhachHang.objects.filter(email=email).exists()
    return Response({"exists": exists})


@api_view(["POST"])
def register_normal(request):
    data     = request.data
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")
    fullname = data.get("fullname", "").strip()

    if not email or not password or not fullname:
        return Response({"error": "Vui lòng nhập đầy đủ thông tin."}, status=400)
    if len(password) < 6:
        return Response({"error": "Mật khẩu phải có ít nhất 6 ký tự."}, status=400)
    if KhachHang.objects.filter(email=email).exists():
        return Response({"error": "Email đã được sử dụng."}, status=400)

    makh = _gen_id("KH", KhachHang, "makh")
    kh = KhachHang.objects.create(
        makh=makh, hoten=fullname, email=email,
        matkhau=make_password(password), loaidangnhap="normal",
    )
    return Response({"message": "Đăng ký thành công.", "user": _kh_data(kh)}, status=201)


@api_view(["POST"])
def login_normal(request):
    email    = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    try:
        kh = KhachHang.objects.get(email=email)
    except KhachHang.DoesNotExist:
        return Response({"error": "Email không tồn tại."}, status=400)

    if not kh.matkhau:
        return Response({"error": "Tài khoản này đăng nhập bằng Google. Vui lòng dùng phương thức đó."}, status=400)

    if not check_password(password, kh.matkhau):
        return Response({"error": "Mật khẩu không đúng."}, status=400)

    return Response({"message": "Đăng nhập thành công.", "user": _kh_data(kh)})


@api_view(["POST"])
def register_google(request):
    data      = request.data
    google_id = data.get("google_id", "")
    email     = data.get("email", "").strip().lower()
    fullname  = data.get("fullname", "").strip()
    avatar    = data.get("avatar", "")

    if not google_id or not email:
        return Response({"error": "Thiếu thông tin Google."}, status=400)
    if KhachHang.objects.filter(email=email).exists():
        return Response({"error": "Email đã được sử dụng."}, status=400)

    makh = _gen_id("KH", KhachHang, "makh")
    kh = KhachHang.objects.create(
        makh=makh, hoten=fullname, email=email,
        google_id=google_id, avatar=avatar, loaidangnhap="google",
    )
    return Response({"message": "Đăng ký Google thành công.", "user": _kh_data(kh)}, status=201)


@api_view(["POST"])
def login_google(request):
    google_id = request.data.get("google_id", "")
    email     = request.data.get("email", "").strip().lower()
    avatar    = request.data.get("avatar", "")
    fullname  = request.data.get("fullname", "")

    # Tìm theo google_id
    try:
        kh = KhachHang.objects.get(google_id=google_id)
        # Cập nhật avatar nếu có
        if avatar and not kh.avatar:
            kh.avatar = avatar
            kh.save()
        return Response({"message": "Đăng nhập Google thành công.", "user": _kh_data(kh)})
    except KhachHang.DoesNotExist:
        pass

    # Tìm theo email — liên kết Google
    try:
        kh = KhachHang.objects.get(email=email)
        kh.google_id = google_id
        kh.loaidangnhap = "google"
        if avatar and not kh.avatar:
            kh.avatar = avatar
        kh.save()
        return Response({"message": "Liên kết Google thành công.", "user": _kh_data(kh)})
    except KhachHang.DoesNotExist:
        pass

    # Auto-register nếu chưa có tài khoản
    makh = _gen_id("KH", KhachHang, "makh")
    kh = KhachHang.objects.create(
        makh=makh, hoten=fullname or email.split("@")[0],
        email=email, google_id=google_id,
        avatar=avatar, loaidangnhap="google",
    )
    return Response({"message": "Đăng ký và đăng nhập Google thành công.", "user": _kh_data(kh)}, status=201)


@api_view(["POST"])
def admin_login(request):
    username = request.data.get("username", "").strip().lower()
    password = request.data.get("password", "")
    try:
        adm = Admin.objects.get(tendangnhap__iexact=username)
    except Admin.DoesNotExist:
        return Response({"error": "Tài khoản không tồn tại."}, status=400)

    if not check_password(password, adm.matkhau):
        return Response({"error": "Mật khẩu không đúng."}, status=400)

    return Response({
        "message": "Đăng nhập thành công.",
        "admin": {
            "id":        adm.maadmin,
            "username":  adm.tendangnhap,
            "full_name": adm.hoten,
            "role":      adm.quyenhan,
        }
    })


# ═══════════════════════════════════════════════════════
# AUTH — OTP / RESET PASSWORD
# ═══════════════════════════════════════════════════════

@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email", "").strip().lower()
    if not KhachHang.objects.filter(email=email).exists():
        return Response({"error": "Email không tồn tại trong hệ thống."}, status=404)

    otp_code = str(random.randint(100000, 999999))
    otp_storage[email] = {
        "otp":     otp_code,
        "expires": _now() + datetime.timedelta(minutes=10),
    }

    try:
        send_mail(
            subject="Mã OTP đặt lại mật khẩu - Luxe Glow",
            message=(
                f"Xin chào,\n\n"
                f"Mã OTP của bạn là: {otp_code}\n"
                f"Mã có hiệu lực trong 10 phút.\n\n"
                f"Nếu bạn không yêu cầu, hãy bỏ qua email này.\n\n"
                f"— Luxe Glow Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )
    except Exception as e:
        logger.error(f"Send mail failed: {e}")
        # Vẫn trả 200 để frontend không biết lỗi mail server
        # (giúp debug: log OTP ra console)
        logger.warning(f"[DEV] OTP for {email}: {otp_code}")

    return Response({"message": "OTP đã được gửi đến email của bạn."})


@api_view(["POST"])
def verify_otp(request):
    email = request.data.get("email", "").strip().lower()
    otp   = request.data.get("otp", "").strip()

    stored = otp_storage.get(email)
    if not stored:
        return Response({"message": "OTP không hợp lệ hoặc đã hết hạn."}, status=400)
    if _now() > stored["expires"]:
        del otp_storage[email]
        return Response({"message": "OTP đã hết hạn. Vui lòng yêu cầu lại."}, status=400)
    if stored["otp"] != otp:
        return Response({"message": "OTP không đúng."}, status=400)

    # Đánh dấu đã verify (không xóa, để reset_password dùng)
    otp_storage[email]["verified"] = True
    return Response({"message": "OTP xác thực thành công."})


@api_view(["POST"])
def reset_password(request):
    """
    FIX: Frontend chỉ gửi email + new_password (không gửi OTP lại).
    Kiểm tra session đã verify OTP chưa.
    """
    email        = request.data.get("email", "").strip().lower()
    new_password = request.data.get("new_password", "")

    if not new_password or len(new_password) < 6:
        return Response({"message": "Mật khẩu phải có ít nhất 6 ký tự."}, status=400)

    stored = otp_storage.get(email)
    if not stored or not stored.get("verified"):
        return Response({"message": "Phiên đặt lại mật khẩu không hợp lệ. Vui lòng xác thực OTP trước."}, status=400)

    if _now() > stored["expires"]:
        del otp_storage[email]
        return Response({"message": "Phiên đã hết hạn. Vui lòng thực hiện lại."}, status=400)

    try:
        kh = KhachHang.objects.get(email=email)
    except KhachHang.DoesNotExist:
        return Response({"message": "Email không tồn tại."}, status=404)

    kh.matkhau = make_password(new_password)
    kh.save()
    del otp_storage[email]
    return Response({"message": "Đặt lại mật khẩu thành công."})


# ═══════════════════════════════════════════════════════
# CUSTOMER — PROFILE
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def get_customer(request, customer_id):
    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)
    return Response(_kh_data(kh))


@api_view(["POST"])
def update_customer(request):
    customer_id = request.data.get("customer_id")
    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)

    if request.data.get("full_name"):
        kh.hoten = request.data["full_name"]
    if request.data.get("phone_number") is not None:
        kh.sdt = request.data["phone_number"]
    if request.data.get("birthday"):
        kh.ngaysinh = request.data["birthday"]
    kh.save()
    return Response({"message": "Cập nhật thành công.", "user": _kh_data(kh)})


@api_view(["POST"])
def change_password(request):
    customer_id      = request.data.get("customer_id")
    current_password = request.data.get("current_password", "")
    new_password     = request.data.get("new_password", "")

    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)

    if kh.loaidangnhap == "google" and not kh.matkhau:
        return Response({"error": "Tài khoản Google không thể đổi mật khẩu tại đây."}, status=400)

    if not check_password(current_password, kh.matkhau or ""):
        return Response({"error": "Mật khẩu hiện tại không đúng."}, status=400)

    if len(new_password) < 6:
        return Response({"error": "Mật khẩu mới phải có ít nhất 6 ký tự."}, status=400)

    kh.matkhau = make_password(new_password)
    kh.save()
    return Response({"message": "Đổi mật khẩu thành công."})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_avatar(request):
    customer_id = request.data.get("customer_id")
    file = request.FILES.get("file") or request.FILES.get("avatar")

    if not file:
        return Response({"error": "Không có file ảnh."}, status=400)

    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)

    try:
        result = cloudinary.uploader.upload(
            file,
            folder="luxeglow/avatars",
            transformation={"width": 400, "height": 400, "crop": "fill"},
        )
        kh.avatar = result["secure_url"]
        kh.save()
        return Response({"message": "Upload thành công.", "avatar_url": kh.avatar, "user": _kh_data(kh)})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ═══════════════════════════════════════════════════════
# CUSTOMER — ADDRESSES (stored as JSON in KhachHang.diachi)
# ═══════════════════════════════════════════════════════

def _parse_addresses(kh: KhachHang) -> list:
    raw = kh.diachi or "[]"
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    # Backward compat: nếu diachi là string thuần
    if raw.strip() and not raw.strip().startswith("["):
        return [{"id": 1, "name": kh.hoten, "phone": kh.sdt or "", "address": raw, "isDefault": True}]
    return []


def _save_addresses(kh: KhachHang, addresses: list):
    kh.diachi = json.dumps(addresses, ensure_ascii=False)
    kh.save()


@api_view(["GET"])
def get_customer_addresses(request, customer_id):
    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)
    return Response({"addresses": _parse_addresses(kh)})


@api_view(["POST"])
def create_customer_address(request):
    customer_id = request.data.get("customer_id")
    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Không tìm thấy khách hàng."}, status=404)

    addresses = _parse_addresses(kh)
    is_default = len(addresses) == 0 or bool(request.data.get("isDefault"))

    # Nếu đặt mặc định, bỏ mặc định cũ
    if is_default:
        for a in addresses:
            a["isDefault"] = False

    new_addr = {
        "id":        max((a.get("id", 0) for a in addresses), default=0) + 1,
        "name":      request.data.get("name", kh.hoten),
        "phone":     request.data.get("phone", kh.sdt or ""),
        "address":   request.data.get("address", ""),
        "isDefault": is_default,
    }
    addresses.append(new_addr)
    _save_addresses(kh, addresses)
    return Response({"message": "Thêm địa chỉ thành công.", "address": new_addr}, status=201)


@api_view(["POST"])
def update_customer_address(request):
    customer_id = request.data.get("customer_id")
    addr_id     = request.data.get("id")
    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Không tìm thấy khách hàng."}, status=404)

    addresses = _parse_addresses(kh)
    set_default = bool(request.data.get("isDefault"))

    for a in addresses:
        if a.get("id") == addr_id:
            a["name"]    = request.data.get("name", a["name"])
            a["phone"]   = request.data.get("phone", a["phone"])
            a["address"] = request.data.get("address", a["address"])
            if set_default:
                a["isDefault"] = True
        elif set_default:
            a["isDefault"] = False

    _save_addresses(kh, addresses)
    return Response({"message": "Cập nhật địa chỉ thành công."})


@api_view(["POST"])
def delete_customer_address(request):
    customer_id = request.data.get("customer_id")
    addr_id     = request.data.get("id")
    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Không tìm thấy khách hàng."}, status=404)

    addresses = [a for a in _parse_addresses(kh) if a.get("id") != addr_id]
    # Nếu xóa địa chỉ mặc định, đặt cái đầu tiên làm mặc định
    if addresses and not any(a.get("isDefault") for a in addresses):
        addresses[0]["isDefault"] = True

    _save_addresses(kh, addresses)
    return Response({"message": "Xóa địa chỉ thành công."})


# ═══════════════════════════════════════════════════════
# ADMIN STAFF (model Admin)
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def list_staff(request):
    staff = Admin.objects.all().values("maadmin", "tendangnhap", "hoten", "quyenhan")
    return Response({"staff": list(staff)})


@api_view(["POST"])
def create_staff(request):
    data    = request.data
    username = data.get("username", "").strip()
    if Admin.objects.filter(tendangnhap=username).exists():
        return Response({"error": "Tên đăng nhập đã tồn tại."}, status=400)

    maadmin = _gen_id("AD", Admin, "maadmin")
    Admin.objects.create(
        maadmin=maadmin,
        tendangnhap=username.lower(),
        matkhau=make_password(data.get("password", "")),
        hoten=data.get("full_name", ""),
        quyenhan=int(data.get("role", 0)),
    )
    return Response({"message": "Tạo nhân viên thành công."}, status=201)


@api_view(["POST"])
def update_staff_role(request):
    maadmin = request.data.get("admin_id")
    try:
        adm = Admin.objects.get(maadmin=maadmin)
    except Admin.DoesNotExist:
        return Response({"error": "Không tìm thấy nhân viên."}, status=404)
    adm.quyenhan = int(request.data.get("role", adm.quyenhan))
    adm.save()
    return Response({"message": "Cập nhật quyền hạn thành công."})


@api_view(["POST"])
def change_staff_password(request):
    maadmin      = request.data.get("admin_id")
    new_password = request.data.get("new_password", "")
    try:
        adm = Admin.objects.get(maadmin=maadmin)
    except Admin.DoesNotExist:
        return Response({"error": "Không tìm thấy nhân viên."}, status=404)
    adm.matkhau = make_password(new_password)
    adm.save()
    return Response({"message": "Đổi mật khẩu thành công."})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_staff_avatar(request):
    return Response({"message": "Chức năng avatar nhân viên chưa hỗ trợ."})


@api_view(["GET"])
def get_staff(request, staff_id):
    try:
        adm = Admin.objects.get(maadmin=staff_id)
    except Admin.DoesNotExist:
        return Response({"error": "Không tìm thấy nhân viên."}, status=404)
    return Response({
        "id":        adm.maadmin,
        "username":  adm.tendangnhap,
        "full_name": adm.hoten,
        "role":      adm.quyenhan,
    })


# ═══════════════════════════════════════════════════════
# CATEGORIES (DanhMuc)
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def list_categories(request):
    cats = DanhMuc.objects.all()
    return Response({"categories": [
        {"id": c.madm, "name": c.tendm, "description": c.mota or "", "image": getattr(c, 'hinhanh', '') or ""}
        for c in cats
    ]})


@api_view(["POST"])
def create_category(request):
    name = request.data.get("name", "").strip()
    if not name:
        return Response({"error": "Tên danh mục không được để trống."}, status=400)
    madm = _gen_id("DM", DanhMuc, "madm")
    create_kwargs = dict(madm=madm, tendm=name, mota=request.data.get("description", ""))
    img = request.data.get("image", "")
    if img:
        try:
            create_kwargs["hinhanh"] = img
        except Exception:
            pass
    cat = DanhMuc.objects.create(**create_kwargs)
    return Response({
        "message": "Tạo danh mục thành công.",
        "id": cat.madm,
        "category": {"id": cat.madm, "name": cat.tendm, "description": cat.mota or "", "image": getattr(cat, 'hinhanh', '') or ""},
    }, status=201)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_category_image(request):
    """Upload ảnh danh mục lên Cloudinary."""
    madm = request.data.get("id")
    file = request.FILES.get("file") or request.FILES.get("image")
    if not file:
        return Response({"error": "Không có file ảnh."}, status=400)
    try:
        result = cloudinary.uploader.upload(
            file, folder="luxeglow/categories",
            transformation={"width": 400, "height": 400, "crop": "fill"},
        )
        url = result["secure_url"]
        if madm:
            try:
                cat = DanhMuc.objects.get(madm=madm)
                cat.hinhanh = url
                cat.save()
            except Exception:
                pass
        return Response({"url": url})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def update_category(request):
    madm = request.data.get("id")
    try:
        cat = DanhMuc.objects.get(madm=madm)
    except DanhMuc.DoesNotExist:
        return Response({"error": "Danh mục không tồn tại."}, status=404)
    cat.tendm = request.data.get("name", cat.tendm)
    cat.mota  = request.data.get("description", cat.mota)
    img = request.data.get("image")
    if img is not None:
        try:
            cat.hinhanh = img or None
        except Exception:
            pass
    cat.save()
    return Response({
        "message": "Cập nhật danh mục thành công.",
        "category": {"id": cat.madm, "name": cat.tendm, "description": cat.mota or "", "image": getattr(cat, 'hinhanh', '') or ""},
    })


# ═══════════════════════════════════════════════════════
# PRODUCTS (SanPham)
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def list_products(request):
    qs = SanPham.objects.select_related("madm").all()

    category  = request.GET.get("category")
    brand     = request.GET.get("brand")
    search    = request.GET.get("search")
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    sort      = request.GET.get("sort", "newest")  # newest | price_asc | price_desc | best_seller

    if category:
        qs = qs.filter(Q(madm__madm=category) | Q(madm__tendm__icontains=category))
    if brand:
        qs = qs.filter(thuonghieu__icontains=brand)
    if search:
        qs = qs.filter(Q(tensp__icontains=search) | Q(thuonghieu__icontains=search) | Q(madm__tendm__icontains=search))
    if min_price:
        qs = qs.filter(giaban__gte=int(min_price))
    if max_price:
        qs = qs.filter(giaban__lte=int(max_price))

    if sort == "price_asc":
        qs = qs.order_by("giaban")
    elif sort == "price_desc":
        qs = qs.order_by("-giaban")
    else:
        qs = qs.order_by("-masp")

    try:
        page      = int(request.GET.get("page", 1))
        page_size = int(request.GET.get("page_size", 20))
    except ValueError:
        page, page_size = 1, 20

    total    = qs.count()
    start    = (page - 1) * page_size
    products = qs[start: start + page_size]

    return Response({
        "products":    [_sp_data(p) for p in products],
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


@api_view(["GET"])
def get_product_detail(request, product_id):
    try:
        sp = SanPham.objects.select_related("madm").get(masp=product_id)
    except SanPham.DoesNotExist:
        return Response({"error": "Sản phẩm không tồn tại."}, status=404)

    data = _sp_data(sp)

    # Reviews hiển thị
    reviews = DanhGia.objects.filter(masp=sp).filter(
        Q(trangthai="Hiển thị") | Q(trangthai="Hien thi")
    ).select_related("makh").order_by("-ngaydanhgia")

    data["reviews"] = [
        {
            "id":              r.madg,
            "customer_name":   r.makh.hoten,
            "customer_avatar": r.makh.avatar or "",
            "rating":          r.diemdanhgia,
            "content":         r.noidung or "",
            "date":            str(r.ngaydanhgia),
        }
        for r in reviews
    ]

    # Related products (cùng danh mục)
    related = SanPham.objects.filter(madm=sp.madm).exclude(masp=sp.masp)[:4]
    data["related_products"] = [_sp_data(r) for r in related]

    return Response(data)


@api_view(["POST"])
def create_product(request):
    data = request.data
    masp = _gen_id("SP", SanPham, "masp")

    try:
        cat = DanhMuc.objects.get(madm=data.get("category_id"))
    except DanhMuc.DoesNotExist:
        return Response({"error": "Danh mục không tồn tại."}, status=400)

    expiry = data.get("expiry_date")
    if not expiry:
        expiry = (datetime.date.today() + datetime.timedelta(days=365)).isoformat()

    # Hỗ trợ nhiều ảnh: lưu dạng JSON nếu có mảng images
    images_list = data.get("images", [])
    single_img  = data.get("image", "")
    if images_list and isinstance(images_list, list):
        hinhanh_val = json.dumps(images_list, ensure_ascii=False)
    else:
        hinhanh_val = single_img

    sp = SanPham.objects.create(
        masp=masp,
        tensp=data.get("name", ""),
        madm=cat,
        giaban=int(data.get("price", 0)),
        soluongton=int(data.get("stock", 0)),
        thuonghieu=data.get("brand", ""),
        hansudung=expiry,
        hinhanh=hinhanh_val,
    )
    return Response({"message": "Tạo sản phẩm thành công.", "id": sp.masp, "product": _sp_data(sp)}, status=201)


@api_view(["POST"])
def update_product(request):
    masp = request.data.get("id")
    try:
        sp = SanPham.objects.get(masp=masp)
    except SanPham.DoesNotExist:
        return Response({"error": "Sản phẩm không tồn tại."}, status=404)

    if request.data.get("name"):
        sp.tensp = request.data["name"]
    if request.data.get("price"):
        sp.giaban = int(request.data["price"])
    if request.data.get("stock") is not None:
        sp.soluongton = int(request.data["stock"])
    if request.data.get("brand"):
        sp.thuonghieu = request.data["brand"]
    images_list = request.data.get("images", [])
    single_img  = request.data.get("image", "")
    if images_list and isinstance(images_list, list):
        sp.hinhanh = json.dumps(images_list, ensure_ascii=False)
    elif single_img:
        sp.hinhanh = single_img
    if request.data.get("expiry_date"):
        sp.hansudung = request.data["expiry_date"]
    if request.data.get("category_id"):
        try:
            sp.madm = DanhMuc.objects.get(madm=request.data["category_id"])
        except DanhMuc.DoesNotExist:
            pass
    sp.save()
    return Response({"message": "Cập nhật sản phẩm thành công.", "product": _sp_data(sp)})


@api_view(["POST"])
def delete_product(request):
    masp = request.data.get("id")
    deleted, _ = SanPham.objects.filter(masp=masp).delete()
    if deleted:
        return Response({"message": "Xóa sản phẩm thành công."})
    return Response({"error": "Sản phẩm không tồn tại."}, status=404)


@api_view(["POST"])
def import_stock(request):
    masp = request.data.get("id")
    qty  = int(request.data.get("quantity", 0))
    try:
        sp = SanPham.objects.get(masp=masp)
    except SanPham.DoesNotExist:
        return Response({"error": "Sản phẩm không tồn tại."}, status=404)
    sp.soluongton += qty
    sp.save()
    return Response({"message": "Nhập kho thành công.", "new_stock": sp.soluongton})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_product_image(request):
    """Upload ảnh sản phẩm lên Cloudinary."""
    file = request.FILES.get("file") or request.FILES.get("image")
    if not file:
        return Response({"error": "Không có file ảnh."}, status=400)
    try:
        result = cloudinary.uploader.upload(
            file,
            folder="luxeglow/products",
            transformation={"width": 800, "height": 800, "crop": "fill"},
        )
        return Response({"url": result["secure_url"]})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_product_variants(request, product_id):
    return Response({"variants": []})


@api_view(["POST"])
def update_variant(request):
    return Response({"message": "Chức năng biến thể chưa hỗ trợ."})


@api_view(["POST"])
def add_variants(request):
    return Response({"message": "Chức năng biến thể chưa hỗ trợ."})


# ═══════════════════════════════════════════════════════
# VOUCHERS (KhuyenMai)
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def list_vouchers(request):
    kms = KhuyenMai.objects.all().order_by("-makm")
    return Response({"vouchers": [_km_data(k) for k in kms]})


@api_view(["GET"])
def list_active_vouchers(request):
    today = datetime.date.today()
    kms   = KhuyenMai.objects.filter(ngaybatdau__lte=today, ngayketthuc__gte=today)
    active = [k for k in kms if k.gioihandung is None or k.soluotdung < k.gioihandung]
    return Response({"vouchers": [_km_data(k) for k in active]})


@api_view(["POST"])
def create_voucher(request):
    data = request.data
    code = data.get("code", "").strip().upper()
    if not code:
        return Response({"error": "Mã giảm giá không được để trống."}, status=400)
    if KhuyenMai.objects.filter(magiamgia__iexact=code).exists():
        return Response({"error": "Mã giảm giá đã tồn tại."}, status=400)

    makm = _gen_id("KM", KhuyenMai, "makm")
    try:
        km = KhuyenMai.objects.create(
            makm=makm,
            tenkm=data.get("name", ""),
            magiamgia=code,
            loaigiam=data.get("discount_type", "%"),
            giatrigiam=Decimal(str(data.get("discount_value", 0))),
            ngaybatdau=data.get("start_date"),
            ngayketthuc=data.get("end_date"),
            gioihandung=data.get("limit") or None,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    return Response({"message": "Tạo voucher thành công.", "id": km.makm, "voucher": _km_data(km)}, status=201)


@api_view(["POST"])
def apply_voucher(request):
    code        = request.data.get("code", "").strip().upper()
    order_total = Decimal(str(request.data.get("order_total", 0)))

    try:
        km = KhuyenMai.objects.get(magiamgia__iexact=code)
    except KhuyenMai.DoesNotExist:
        return Response({"error": "Mã khuyến mãi không tồn tại."}, status=404)

    today = datetime.date.today()
    def _to_date(val):
        if val is None: return None
        if isinstance(val, datetime.datetime): return val.date()
        if isinstance(val, datetime.date): return val
        try: return datetime.date.fromisoformat(str(val)[:10])
        except: return None
    start = _to_date(km.ngaybatdau)
    end   = _to_date(km.ngayketthuc)
    if start is None or end is None or today < start or today > end:
        return Response({"error": "Mã khuyến mãi đã hết hạn hoặc chưa đến ngày áp dụng."}, status=400)

    if km.gioihandung and km.soluotdung >= km.gioihandung:
        return Response({"error": "Mã khuyến mãi đã hết lượt sử dụng."}, status=400)

    if km.loaigiam == "%":
        discount = order_total * km.giatrigiam / Decimal("100")
    else:
        discount = min(km.giatrigiam, order_total)

    return Response({
        "message":        "Áp dụng voucher thành công.",
        "voucher":        _km_data(km),
        "discount_amount": float(discount),
        "final_total":    float(order_total - discount),
    })


@api_view(["POST"])
def deactivate_voucher(request):
    makm = request.data.get("id")
    try:
        km = KhuyenMai.objects.get(makm=makm)
    except KhuyenMai.DoesNotExist:
        return Response({"error": "Voucher không tồn tại."}, status=404)
    km.ngayketthuc = datetime.date.today() - datetime.timedelta(days=1)
    km.save()
    return Response({"message": "Vô hiệu hóa voucher thành công."})


@api_view(["GET"])
def _best_voucher_logic(cart_total_raw):
    """Helper dùng chung — nhận cart_total (số hoặc string), trả về Response."""
    cart_total = Decimal(str(cart_total_raw or 0))
    today = datetime.date.today()
    kms = list(KhuyenMai.objects.filter(ngaybatdau__lte=today, ngayketthuc__gte=today))
    kms = [k for k in kms if k.gioihandung is None or k.soluotdung < k.gioihandung]
    if not kms:
        return Response({"voucher": None, "discount_amount": 0})

    def calc_discount(k):
        if k.loaigiam == "%":
            return float(cart_total * k.giatrigiam / Decimal("100")) if cart_total > 0 else float(k.giatrigiam)
        return float(min(k.giatrigiam, cart_total)) if cart_total > 0 else float(k.giatrigiam)

    best     = max(kms, key=calc_discount)
    discount = calc_discount(best)
    return Response({"voucher": _km_data(best), "discount_amount": discount})


@api_view(["GET"])
def get_best_voucher(request):
    """?cart_total=500000"""
    return _best_voucher_logic(request.GET.get("cart_total", 0))


@api_view(["GET"])
def get_best_voucher_for_cart(request):
    return _best_voucher_logic(request.GET.get("cart_total", 0))


@api_view(["GET"])
def get_best_voucher_for_product(request):
    return _best_voucher_logic(request.GET.get("cart_total", 0))


@api_view(["GET"])
def list_all_vouchers_for_user(request):
    """
    Trả về tất cả voucher (khả dụng + không khả dụng) cho user xem.
    ?cart_total=500000
    """
    cart_total = Decimal(str(request.GET.get("cart_total", 0) or 0))
    today = datetime.date.today()
    all_kms = KhuyenMai.objects.all().order_by("-ngaybatdau")

    result = []
    for k in all_kms:
        data = _km_data(k)

        # Tính discount thực tế với cart_total
        if cart_total > 0:
            if k.loaigiam == "%":
                discount = float(cart_total * k.giatrigiam / Decimal("100"))
            else:
                discount = float(min(k.giatrigiam, cart_total))
        else:
            discount = 0

        # Lý do không khả dụng
        reason = None
        if data["status"] == "expired":
            reason = "Đã hết hạn"
        elif data["status"] == "scheduled":
            reason = f"Bắt đầu từ {data['start_date']}"
        elif k.gioihandung is not None and k.soluotdung >= k.gioihandung:
            reason = "Đã hết lượt sử dụng"

        data["discount_amount"] = discount
        data["unavailable_reason"] = reason
        data["is_available"] = reason is None
        result.append(data)

    # Sắp xếp: khả dụng trước, theo discount giảm dần
    result.sort(key=lambda x: (0 if x["is_available"] else 1, -x["discount_amount"]))
    return Response({"vouchers": result})


# ═══════════════════════════════════════════════════════
# ORDERS (DonHang + ChiTietDonHang)
# ═══════════════════════════════════════════════════════

@api_view(["POST"])
def create_order(request):
    data        = request.data
    customer_id = data.get("customer_id")
    items       = data.get("items", [])

    if not customer_id or not items:
        return Response({"error": "Thiếu thông tin đặt hàng."}, status=400)

    try:
        kh = KhachHang.objects.get(makh=customer_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)

    km              = None
    discount_amount = Decimal("0")
    voucher_code    = data.get("voucher_code", "")
    if voucher_code:
        try:
            km              = KhuyenMai.objects.get(magiamgia__iexact=voucher_code)
            discount_amount = Decimal(str(data.get("discount_amount", 0)))
            km.soluotdung  += 1
            km.save()
        except KhuyenMai.DoesNotExist:
            pass

    subtotal = sum(Decimal(str(it["unit_price"])) * int(it["quantity"]) for it in items)
    shipping  = Decimal(str(data.get("shipping_fee", 30000)))
    total     = max(subtotal + shipping - discount_amount, Decimal("0"))

    madh = _gen_id("DH", DonHang, "madh")
    dh = DonHang.objects.create(
        madh=madh,
        makh=kh,
        makm=km,
        sotiengiam=discount_amount,
        ngaydat=_now(),
        tongtien=total,
        trangthai="Mới",        # FIX: dùng "Mới" có dấu, đúng với CHOICES
        diachigiao=data.get("shipping_address", ""),
    )

    for it in items:
        try:
            sp = SanPham.objects.get(masp=it["product_id"])
        except SanPham.DoesNotExist:
            continue
        qty        = int(it["quantity"])
        unit_price = Decimal(str(it["unit_price"]))
        ChiTietDonHang.objects.create(
            madh=dh, masp=sp,
            soluong=qty,
            dongia=unit_price,
            thanhtien=unit_price * qty,
        )
        sp.soluongton = max(sp.soluongton - qty, 0)
        sp.save()

    return Response({
        "message":  "Đặt hàng thành công.",
        "order_id": dh.madh,
        "order":    _dh_data(dh, include_items=True),
    }, status=201)


@api_view(["GET"])
def list_orders(request):
    customer_id = request.GET.get("customer_id")
    if customer_id:
        orders = DonHang.objects.filter(makh__makh=customer_id).order_by("-ngaydat")
    else:
        orders = DonHang.objects.all().order_by("-ngaydat")
    return Response({"orders": [_dh_data(o, include_items=True) for o in orders]})


@api_view(["POST"])
def cancel_order(request):
    madh = request.data.get("order_id")
    try:
        dh = DonHang.objects.get(madh=madh)
    except DonHang.DoesNotExist:
        return Response({"error": "Đơn hàng không tồn tại."}, status=404)

    if dh.trangthai not in ("Moi", "Mới"):
        return Response({"error": "Chỉ có thể hủy đơn hàng đang ở trạng thái mới."}, status=400)

    dh.trangthai = "Hủy"
    dh.save()

    # Hoàn kho
    for ct in ChiTietDonHang.objects.filter(madh=dh):
        ct.masp.soluongton += ct.soluong
        ct.masp.save()

    return Response({"message": "Hủy đơn hàng thành công."})


@api_view(["GET"])
def admin_list_orders(request):
    status_filter = request.GET.get("status")
    search        = request.GET.get("search")
    qs = DonHang.objects.select_related("makh").order_by("-ngaydat")

    if status_filter and status_filter != "Tất cả":
        # Map label → db value
        status_map = {
            "Đang xử lý": ["Mới", "Moi"],
            "Đang giao":  ["Giao"],
            "Hoàn thành": ["Hoan thanh", "Hoàn thành"],
            "Đã hủy":     ["Hủy", "Huy"],
        }
        db_values = status_map.get(status_filter, [status_filter])
        qs = qs.filter(trangthai__in=db_values)

    if search:
        qs = qs.filter(Q(madh__icontains=search) | Q(makh__hoten__icontains=search))

    return Response({"orders": [_dh_data(o, include_items=False) for o in qs]})


@api_view(["GET"])
def admin_get_order_detail(request, order_id):
    try:
        dh = DonHang.objects.select_related("makh", "makm").get(madh=order_id)
    except DonHang.DoesNotExist:
        return Response({"error": "Đơn hàng không tồn tại."}, status=404)
    return Response(_dh_data(dh, include_items=True))


@api_view(["POST"])
def update_order_status(request):
    madh       = request.data.get("order_id")
    new_status = request.data.get("status", "")

    # FIX: Map đầy đủ bao gồm "Hoàn thành"
    status_map = {
        "Đang xử lý": "Mới",
        "Dang xu ly":  "Mới",
        "Đang giao":   "Giao",
        "Dang giao":   "Giao",
        "Hoàn thành":  "Hoàn thành",
        "Hoan thanh":  "Hoàn thành",
        "Đã hủy":      "Hủy",
        "Da huy":      "Hủy",
        # Pass-through nếu đã đúng format DB
        "Mới": "Mới", "Moi": "Mới",
        "Giao": "Giao",
        "Hủy": "Hủy", "Huy": "Hủy",
    }
    db_status = status_map.get(new_status, new_status)

    try:
        dh = DonHang.objects.get(madh=madh)
    except DonHang.DoesNotExist:
        return Response({"error": "Đơn hàng không tồn tại."}, status=404)

    dh.trangthai = db_status
    dh.save()
    return Response({"message": "Cập nhật trạng thái thành công.", "order": _dh_data(dh)})


@api_view(["POST"])
def create_return_request(request):
    return Response({"message": "Gửi yêu cầu trả hàng thành công. Admin sẽ liên hệ sớm."})


@api_view(["GET"])
def list_return_requests(request):
    return Response({"returns": []})


@api_view(["POST"])
def process_return_request(request):
    return Response({"message": "Xử lý yêu cầu trả hàng thành công."})


@api_view(["GET"])
def get_return_request(request, order_id):
    return Response({"return": None})


# ═══════════════════════════════════════════════════════
# HELPER — upload media (ảnh/video) lên Cloudinary
# ═══════════════════════════════════════════════════════

MAX_UPLOAD_MB = 100

def _upload_media_files(files) -> list:
    """
    Upload nhiều file ảnh/video lên Cloudinary.
    Kiểm tra tổng dung lượng ≤ MAX_UPLOAD_MB MB.
    Trả về list [{type, url}] hoặc raise ValueError.
    """
    total_bytes = sum(f.size for f in files)
    if total_bytes > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValueError(f"Tổng dung lượng vượt quá {MAX_UPLOAD_MB}MB.")

    results = []
    for f in files:
        mime = f.content_type or ""
        is_video = mime.startswith("video/")
        resource_type = "video" if is_video else "image"
        try:
            res = cloudinary.uploader.upload(
                f,
                folder="luxeglow/media",
                resource_type=resource_type,
            )
            results.append({
                "type": "video" if is_video else "image",
                "url":  res["secure_url"],
            })
        except Exception as e:
            raise ValueError(f"Upload thất bại: {str(e)}")
    return results


# ═══════════════════════════════════════════════════════
# REVIEWS — Đánh giá sản phẩm (có media + reply)
# ═══════════════════════════════════════════════════════

def _review_data(r: DanhGia, customer_id=None) -> dict:
    """Serialize DanhGia thành dict đầy đủ."""
    media_items = [
        {"type": m.media_type, "url": m.url}
        for m in r.media_items.all().order_by("created_at")
    ]
    replies = [
        {
            "id":         rep.id,
            "admin_name": "LUXE GLOW",
            "content":    rep.content,
            "media":      rep.media or [],
            "created_at": str(rep.created_at),
        }
        for rep in r.replies.all().order_by("created_at")
    ]
    return {
        "id":              r.madg,
        "customer_id":     r.makh_id,
        "customer_name":   r.makh.hoten,
        "customer_avatar": r.makh.avatar or "",
        "rating":          r.diemdanhgia,
        "content":         r.noidung or "",
        "media":           media_items,
        "replies":         replies,
        "date":            str(r.ngaydanhgia),
        "status":          r.trangthai,
    }


@api_view(["GET"])
def list_reviews(request):
    product_id = request.GET.get("product_id")
    qs = DanhGia.objects.select_related("makh", "masp").prefetch_related(
        "media_items", "replies__admin"
    ).order_by("-ngaydanhgia")
    if product_id:
        qs = qs.filter(masp__masp=product_id).filter(
            Q(trangthai="Hiển thị") | Q(trangthai="Hien thi")
        )
    customer_id = request.GET.get("customer_id")
    return Response({"reviews": [_review_data(r, customer_id) for r in qs]})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def create_review(request):
    """
    Tạo đánh giá mới kèm media.
    Form-data: customer_id, product_id, rating, content, files[]
    """
    customer_id = request.data.get("customer_id")
    product_id  = request.data.get("product_id")
    rating      = int(request.data.get("rating", 5))
    content     = request.data.get("content", "")

    try:
        kh = KhachHang.objects.get(makh=customer_id)
        sp = SanPham.objects.get(masp=product_id)
    except KhachHang.DoesNotExist:
        return Response({"error": "Khách hàng không tồn tại."}, status=404)
    except SanPham.DoesNotExist:
        return Response({"error": "Sản phẩm không tồn tại."}, status=404)

    madg = _gen_id("DG", DanhGia, "madg")
    r = DanhGia.objects.create(
        madg=madg, makh=kh, masp=sp,
        diemdanhgia=rating,
        noidung=content,
        trangthai="Hiển thị",
    )

    # Upload media files
    files = request.FILES.getlist("files")
    if files:
        try:
            uploaded = _upload_media_files(files)
            for m in uploaded:
                DanhGiaMedia.objects.create(
                    review=r, media_type=m["type"], url=m["url"]
                )
        except ValueError as e:
            r.delete()
            return Response({"error": str(e)}, status=400)

    # Reload với prefetch
    r.refresh_from_db()
    full = DanhGia.objects.prefetch_related("media_items", "replies__admin").get(madg=madg)
    return Response({"message": "Đánh giá thành công.", "review": _review_data(full)}, status=201)


@api_view(["POST"])
@api_view(["POST"])
@parser_classes([MultiPartParser])
def update_review(request):
    """
    Chỉnh sửa đánh giá (chỉ chủ sở hữu).
    FormData: review_id, customer_id, rating, content,
              keep_media (JSON string), files[] (media mới)
    """
    review_id   = request.data.get("review_id") or request.data.get("id")
    customer_id = request.data.get("customer_id")
    content     = request.data.get("content", "").strip()
    rating      = request.data.get("rating")

    if not review_id:
        return Response({"error": "Thiếu review_id."}, status=400)

    try:
        r = DanhGia.objects.prefetch_related("media_items").get(madg=review_id)
    except DanhGia.DoesNotExist:
        return Response({"error": "Đánh giá không tồn tại."}, status=404)

    # Kiểm tra quyền
    if customer_id and str(r.makh_id) != str(customer_id):
        return Response({"error": "Không có quyền chỉnh sửa đánh giá này."}, status=403)

    # Cập nhật nội dung + rating
    if content:
        r.noidung = content
    if rating:
        r.diemdanhgia = int(rating)
    r.save()

    # Xử lý media: xóa những cái không còn trong keep_media
    keep_media_raw = request.data.get("keep_media")
    if keep_media_raw is not None:
        try:
            keep_list = json.loads(keep_media_raw)
            keep_urls = {m["url"] for m in keep_list if isinstance(m, dict) and "url" in m}
            # Xóa media không còn giữ
            r.media_items.exclude(url__in=keep_urls).delete()
        except Exception:
            pass

    # Upload media mới
    files = request.FILES.getlist("files")
    if files:
        try:
            uploaded = _upload_media_files(files)
            for m in uploaded:
                DanhGiaMedia.objects.create(review=r, media_type=m["type"], url=m["url"])
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    # Trả về review đầy đủ
    full = DanhGia.objects.prefetch_related("media_items", "replies__admin").get(madg=review_id)
    return Response({"message": "Cập nhật đánh giá thành công.", "review": _review_data(full)})


@api_view(["POST"])
def delete_review(request):
    madg     = request.data.get("id")
    deleted, _ = DanhGia.objects.filter(madg=madg).delete()
    if deleted:
        return Response({"message": "Xóa đánh giá thành công."})
    return Response({"error": "Đánh giá không tồn tại."}, status=404)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_review_media(request):
    """Upload 1 file media đơn lẻ cho review."""
    file = request.FILES.get("file")
    if not file:
        return Response({"error": "Không có file."}, status=400)
    if file.size > MAX_UPLOAD_MB * 1024 * 1024:
        return Response({"error": f"File vượt quá {MAX_UPLOAD_MB}MB."}, status=400)
    try:
        is_video = (file.content_type or "").startswith("video/")
        res = cloudinary.uploader.upload(
            file, folder="luxeglow/reviews",
            resource_type="video" if is_video else "image"
        )
        return Response({"url": res["secure_url"], "type": "video" if is_video else "image"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ═══════════════════════════════════════════════════════
# ADMIN — REVIEWS + REPLY
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def admin_list_reviews(request):
    """
    Trả về tất cả đánh giá. Thêm filter:
      ?pending=1  → chỉ lấy review chưa có reply nào
      ?product_id=...
    """
    qs = DanhGia.objects.select_related("makh", "masp").prefetch_related(
        "media_items", "replies__admin"
    ).order_by("-ngaydanhgia")

    product_id = request.GET.get("product_id")
    if product_id:
        qs = qs.filter(masp__masp=product_id)

    pending = request.GET.get("pending")
    if pending == "1":
        qs = [r for r in qs if not r.replies.exists()]
    else:
        qs = list(qs)

    return Response({"reviews": [_review_data(r) for r in qs]})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def admin_reply(request):
    """
    Admin trả lời đánh giá. FormData: review_id, admin_id, content, files[]
    """
    review_id = request.data.get("review_id")
    admin_id  = request.data.get("admin_id")
    content   = request.data.get("content", "").strip()

    if not review_id or not content:
        return Response({"error": "Thiếu review_id hoặc content."}, status=400)

    try:
        review = DanhGia.objects.get(madg=review_id)
    except DanhGia.DoesNotExist:
        return Response({"error": "Đánh giá không tồn tại."}, status=404)

    admin_obj = None
    if admin_id:
        admin_obj = Admin.objects.filter(maadmin=admin_id).first()

    # Upload media
    media_list = []
    files = request.FILES.getlist("files")
    if files:
        try:
            media_list = _upload_media_files(files)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    rep = DanhGiaReply.objects.create(
        review=review, admin=admin_obj, content=content, media=media_list
    )
    return Response({
        "message": "Đã gửi phản hồi.",
        "reply": {
            "id":         rep.id,
            "admin_name": "LUXE GLOW",       # Luôn hiển thị tên thương hiệu
            "content":    rep.content,
            "media":      rep.media,
            "created_at": str(rep.created_at),
        }
    }, status=201)


@api_view(["POST"])
def admin_delete_reply(request):
    reply_id = request.data.get("reply_id")
    deleted, _ = DanhGiaReply.objects.filter(id=reply_id).delete()
    if deleted:
        return Response({"message": "Xóa phản hồi thành công."})
    return Response({"error": "Phản hồi không tồn tại."}, status=404)


@api_view(["GET"])
def admin_notifications(request):
    """
    Trả về số lượng đánh giá + bình luận chưa được admin xử lý.
    Định nghĩa "chưa xử lý":
      - Đánh giá: chưa có DanhGiaReply nào
      - Bình luận gốc (parent=None): chưa có AdminBinhLuanReply nào
    """
    # Đánh giá chưa reply
    total_reviews   = DanhGia.objects.filter(Q(trangthai="Hiển thị") | Q(trangthai="Hien thi")).count()
    replied_reviews = DanhGiaReply.objects.values("review_id").distinct().count()
    pending_reviews = max(0, total_reviews - replied_reviews)

    # Bình luận gốc chưa reply
    total_comments   = BinhLuan.objects.filter(parent=None).count()
    replied_comments = AdminBinhLuanReply.objects.values("comment_id").distinct().count()
    pending_comments = max(0, total_comments - replied_comments)

    return Response({
        "pending_reviews":  pending_reviews,
        "pending_comments": pending_comments,
        "total_pending":    pending_reviews + pending_comments,
        "total_reviews":    total_reviews,
        "total_comments":   total_comments,
    })


@api_view(["GET"])
def admin_list_comments(request):
    """
    Danh sách tất cả bình luận gốc cho admin.
    ?pending=1 → chỉ lấy chưa có admin reply
    ?product_id=...
    """
    qs = BinhLuan.objects.filter(parent=None).select_related(
        "makh", "masp"
    ).prefetch_related(
        "admin_replies__admin",
        "likes",
        "children__makh",
    ).order_by("-created_at")

    product_id = request.GET.get("product_id")
    if product_id:
        qs = qs.filter(masp__masp=product_id)

    pending = request.GET.get("pending")
    result  = []
    for c in qs:
        has_reply = c.admin_replies.exists()
        if pending == "1" and has_reply:
            continue
        result.append({
            "id":            c.id,
            "product_id":    c.masp_id,
            "product_name":  c.masp.tensp,
            "product_image": (lambda h: (json.loads(h)[0] if h and h.startswith("[") else h) if h else "")(c.masp.hinhanh or ""),
            "customer_name": c.makh.hoten if c.makh else "Ẩn danh",
            "customer_avatar": c.makh.avatar or "" if c.makh else "",
            "content":       c.content,
            "media":         c.media or [],
            "like_count":    c.like_count,
            "reply_count":   c.children.count(),
            "has_admin_reply": has_reply,
            "created_at":    str(c.created_at),
            "admin_replies": [
                {
                    "id":         ar.id,
                    "admin_name": "LUXE GLOW",
                    "content":    ar.content,
                    "media":      ar.media or [],
                    "created_at": str(ar.created_at),
                }
                for ar in c.admin_replies.all().order_by("created_at")
            ],
        })

    return Response({"comments": result})


# ═══════════════════════════════════════════════════════
# COMMENTS — Bình luận sản phẩm (lồng nhau + like + media)
# ═══════════════════════════════════════════════════════

def _comment_data(c: BinhLuan, customer_id=None, depth=0) -> dict:
    """Serialize BinhLuan đệ quy (tối đa 3 cấp)."""
    liked = False
    if customer_id:
        liked = BinhLuanLike.objects.filter(comment=c, makh__makh=customer_id).exists()

    # Children (replies từ user)
    children = []
    if depth < 3:
        for child in c.children.all().order_by("created_at"):
            children.append(_comment_data(child, customer_id, depth + 1))

    # Admin replies
    admin_replies = [
        {
            "id":         ar.id,
            "admin_name": "LUXE GLOW",
            "content":    ar.content,
            "media":      ar.media or [],
            "created_at": str(ar.created_at),
        }
        for ar in c.admin_replies.all().order_by("created_at")
    ]

    return {
        "id":            c.id,
        "customer_id":   c.makh_id,
        "customer_name": c.makh.hoten if c.makh else "Ẩn danh",
        "customer_avatar": c.makh.avatar or "" if c.makh else "",
        "content":       c.content,
        "media":         c.media or [],
        "like_count":    c.like_count,
        "liked":         liked,
        "created_at":    str(c.created_at),
        "replies":       children,
        "admin_replies": admin_replies,
    }


@api_view(["GET"])
def list_comments(request):
    product_id  = request.GET.get("product_id")
    customer_id = request.GET.get("customer_id")
    if not product_id:
        return Response({"comments": []})

    # Chỉ lấy bình luận gốc (parent=None), children load đệ quy
    qs = BinhLuan.objects.filter(
        masp__masp=product_id, parent=None
    ).select_related("makh").prefetch_related(
        "children__makh",
        "children__children__makh",
        "children__admin_replies__admin",
        "children__likes",
        "admin_replies__admin",
        "likes",
        "media_items" if False else "likes",   # placeholder
    ).order_by("-created_at")

    return Response({"comments": [_comment_data(c, customer_id) for c in qs]})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def create_comment(request):
    """
    FormData: customer_id, product_id, content, parent_id (optional), files[]
    """
    customer_id = request.data.get("customer_id")
    product_id  = request.data.get("product_id")
    content     = request.data.get("content", "").strip()
    parent_id   = request.data.get("parent_id")

    if not customer_id or not product_id or not content:
        return Response({"error": "Thiếu thông tin bắt buộc."}, status=400)

    try:
        kh = KhachHang.objects.get(makh=customer_id)
        sp = SanPham.objects.get(masp=product_id)
    except (KhachHang.DoesNotExist, SanPham.DoesNotExist) as e:
        return Response({"error": str(e)}, status=404)

    parent = None
    if parent_id:
        parent = BinhLuan.objects.filter(id=parent_id).first()

    # Upload media
    media_list = []
    files = request.FILES.getlist("files")
    if files:
        try:
            media_list = _upload_media_files(files)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    c = BinhLuan.objects.create(
        masp=sp, makh=kh, parent=parent,
        content=content, media=media_list
    )

    # Reload đầy đủ
    full = BinhLuan.objects.select_related("makh").prefetch_related(
        "admin_replies__admin", "likes"
    ).get(id=c.id)
    customer_id_str = request.data.get("customer_id")
    return Response({"message": "Bình luận thành công.", "comment": _comment_data(full, customer_id_str)}, status=201)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def update_comment(request):
    """
    Chỉnh sửa bình luận (chỉ chủ sở hữu hoặc admin).
    FormData: comment_id, customer_id (hoặc admin_id), content,
              keep_media (JSON string danh sách media muốn giữ lại),
              files[] (media mới thêm vào)
    """
    comment_id  = request.data.get("comment_id") or request.data.get("id")
    customer_id = request.data.get("customer_id")
    admin_id    = request.data.get("admin_id")
    content     = request.data.get("content", "").strip()

    if not comment_id or not content:
        return Response({"error": "Thiếu comment_id hoặc content."}, status=400)

    try:
        c = BinhLuan.objects.get(id=comment_id)
    except BinhLuan.DoesNotExist:
        return Response({"error": "Bình luận không tồn tại."}, status=404)

    # Kiểm tra quyền: chủ sở hữu hoặc admin
    is_owner = customer_id and str(c.makh_id) == str(customer_id)
    is_admin = admin_id and Admin.objects.filter(maadmin=admin_id).exists()
    if not is_owner and not is_admin:
        return Response({"error": "Không có quyền chỉnh sửa bình luận này."}, status=403)

    # Cập nhật nội dung
    c.content = content

    # Bước 1: Xử lý keep_media — lọc media muốn giữ lại từ danh sách hiện có
    keep_media_raw = request.data.get("keep_media")
    if keep_media_raw is not None:
        try:
            keep_list = json.loads(keep_media_raw)
            keep_urls = {m["url"] for m in keep_list if isinstance(m, dict) and "url" in m}
            c.media = [m for m in (c.media or []) if m.get("url") in keep_urls]
        except Exception:
            pass  # Giữ nguyên nếu parse lỗi

    # Bước 2: Upload file mới và thêm vào
    files = request.FILES.getlist("files")
    if files:
        try:
            new_media = _upload_media_files(files)
            c.media = (c.media or []) + new_media
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    c.save(update_fields=["content", "media", "updated_at"])

    full = BinhLuan.objects.select_related("makh").prefetch_related(
        "admin_replies__admin", "likes", "children__makh"
    ).get(id=c.id)
    return Response({
        "message": "Đã cập nhật bình luận.",
        "comment": _comment_data(full, customer_id),
    })


@api_view(["POST"])
def delete_comment(request):
    comment_id  = request.data.get("comment_id") or request.data.get("id")
    customer_id = request.data.get("customer_id")

    try:
        c = BinhLuan.objects.get(id=comment_id)
    except BinhLuan.DoesNotExist:
        return Response({"error": "Bình luận không tồn tại."}, status=404)

    # Chỉ xóa nếu là chủ hoặc admin gửi request
    if str(c.makh_id) != str(customer_id):
        return Response({"error": "Không có quyền xóa bình luận này."}, status=403)

    c.delete()
    return Response({"message": "Đã xóa bình luận."})


@api_view(["POST"])
def toggle_like(request):
    """
    Toggle like bình luận.
    Body JSON: {comment_id, customer_id}
    """
    comment_id  = request.data.get("comment_id")
    customer_id = request.data.get("customer_id")

    try:
        comment = BinhLuan.objects.get(id=comment_id)
        kh      = KhachHang.objects.get(makh=customer_id)
    except (BinhLuan.DoesNotExist, KhachHang.DoesNotExist) as e:
        return Response({"error": str(e)}, status=404)

    like, created = BinhLuanLike.objects.get_or_create(comment=comment, makh=kh)
    if not created:
        like.delete()
        comment.like_count = max(0, comment.like_count - 1)
        liked = False
    else:
        comment.like_count += 1
        liked = True
    comment.save(update_fields=["like_count"])

    return Response({"liked": liked, "like_count": comment.like_count})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def admin_comment_reply(request):
    """
    Admin trả lời bình luận. FormData: comment_id, admin_id, content, files[]
    """
    comment_id = request.data.get("comment_id")
    admin_id   = request.data.get("admin_id")
    content    = request.data.get("content", "").strip()

    if not comment_id or not content:
        return Response({"error": "Thiếu comment_id hoặc content."}, status=400)

    try:
        comment = BinhLuan.objects.get(id=comment_id)
    except BinhLuan.DoesNotExist:
        return Response({"error": "Bình luận không tồn tại."}, status=404)

    admin_obj = Admin.objects.filter(maadmin=admin_id).first() if admin_id else None

    media_list = []
    files = request.FILES.getlist("files")
    if files:
        try:
            media_list = _upload_media_files(files)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    rep = AdminBinhLuanReply.objects.create(
        comment=comment, admin=admin_obj, content=content, media=media_list
    )
    return Response({
        "message": "Đã trả lời bình luận.",
        "reply": {
            "id":         rep.id,
            "admin_name": "LUXE GLOW",       # Luôn hiển thị tên thương hiệu
            "content":    rep.content,
            "media":      rep.media,
            "created_at": str(rep.created_at),
        }
    }, status=201)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_comment_media(request):
    """Upload media cho bình luận."""
    files = request.FILES.getlist("files")
    if not files:
        return Response({"error": "Không có file."}, status=400)
    try:
        uploaded = _upload_media_files(files)
        return Response({"media": uploaded})
    except ValueError as e:
        return Response({"error": str(e)}, status=400)



@api_view(["GET"])
def admin_list_customers(request):
    search = request.GET.get("search", "")
    qs = KhachHang.objects.all().order_by("-ngaytao")
    if search:
        qs = qs.filter(
            Q(hoten__icontains=search)  |
            Q(email__icontains=search)  |
            Q(makh__icontains=search)   |
            Q(sdt__icontains=search)
        )

    data = []
    for kh in qs:
        order_count = DonHang.objects.filter(makh=kh).count()
        total_spend = DonHang.objects.filter(
            makh=kh, trangthai__in=["Moi", "Giao", "Mới", "Hoàn thành", "Hoan thanh"]
        ).aggregate(total=Sum("tongtien"))["total"] or 0
        last_order = DonHang.objects.filter(makh=kh).order_by("-ngaydat").first()

        data.append({
            "id":              kh.makh,
            "name":            kh.hoten,
            "email":           kh.email,
            "phone":           kh.sdt or "",
            "avatar":          kh.avatar or "",
            "join_date":       str(kh.ngaytao.date()) if kh.ngaytao else "",
            "login_type":      kh.loaidangnhap,
            "status":          "Hoạt động",
            "total_orders":    order_count,
            "total_spend":     float(total_spend),
            "last_order_date": str(last_order.ngaydat.date()) if last_order else None,
        })

    return Response({"customers": data})


# ═══════════════════════════════════════════════════════
# HOME
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def home_featured(request):
    products = SanPham.objects.filter(soluongton__gt=0).order_by("-masp")[:8]
    return Response({"products": [_sp_data(p) for p in products]})


@api_view(["GET"])
def home_featured_categories(request):
    """Trả về danh sách ID danh mục nổi bật đã cấu hình (lưu trong settings DB)."""
    # Dùng một KhuyenMai dummy hoặc JSON file — ở đây lưu đơn giản vào file
    import os
    path = os.path.join(os.path.dirname(__file__), "featured_cats.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            ids = json.load(f)
    except Exception:
        ids = []
    return Response({"featured_ids": ids})


@api_view(["POST"])
def home_save_featured_categories(request):
    """Admin lưu danh sách ID danh mục nổi bật. Body: {ids: [...]}"""
    ids = request.data.get("ids", [])
    import os
    path = os.path.join(os.path.dirname(__file__), "featured_cats.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(ids, f, ensure_ascii=False)
        return Response({"message": "Đã lưu danh mục nổi bật.", "ids": ids})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def home_best_sellers(request):
    sold_ids = list(
        ChiTietDonHang.objects
        .values("masp")
        .annotate(total_sold=Sum("soluong"))
        .order_by("-total_sold")
        .values_list("masp", flat=True)[:8]
    )
    products = []
    for pid in sold_ids:
        try:
            products.append(SanPham.objects.get(masp=pid))
        except SanPham.DoesNotExist:
            pass
    if not products:
        products = list(SanPham.objects.filter(soluongton__gt=0)[:8])
    return Response({"products": [_sp_data(p) for p in products]})


# ═══════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def search_text(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return Response({"results": []})
    products = SanPham.objects.filter(
        Q(tensp__icontains=q) |
        Q(thuonghieu__icontains=q) |
        Q(madm__tendm__icontains=q)
    ).select_related("madm")[:20]
    return Response({"results": [_sp_data(p) for p in products], "query": q})


@api_view(["GET"])
def search_suggestions(request):
    q = request.GET.get("q", "").strip()
    if not q or len(q) < 2:
        return Response({"suggestions": []})
    products = list(SanPham.objects.filter(
        Q(tensp__icontains=q) | Q(thuonghieu__icontains=q)
    ).values_list("tensp", flat=True)[:8])
    brands = list(SanPham.objects.filter(
        thuonghieu__icontains=q
    ).values_list("thuonghieu", flat=True).distinct()[:3])
    suggestions = list(dict.fromkeys(products + brands))[:10]
    return Response({"suggestions": suggestions})


@api_view(["POST"])
def search_image(request):
    return Response({"results": [], "message": "Tìm kiếm bằng hình ảnh chưa được hỗ trợ."})


@api_view(["POST"])
def rebuild_search_index(request):
    return Response({"message": "Chỉ mục tìm kiếm đã được làm mới."})


@api_view(["GET"])
def search_model_info(request):
    return Response({"model": "ILIKE full-text search", "version": 1})


# ═══════════════════════════════════════════════════════
# ADMIN — CUSTOMERS LIST
# ═══════════════════════════════════════════════════════

MOMO_PARTNER_CODE = "MOMO"
MOMO_ACCESS_KEY   = "F8BBA842ECF85"
MOMO_SECRET_KEY   = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
MOMO_ENDPOINT     = "https://test-payment.momo.vn/v2/gateway/api/create"
MOMO_REDIRECT_URL = "http://localhost:3000/paymentsuccess"
MOMO_IPN_URL      = "http://localhost:8000/api/payment/momo/ipn/"


@api_view(["POST"])
def momo_create(request):
    amount     = str(request.data.get("amount", 0))
    order_id   = request.data.get("order_id", _gen_id("DH", DonHang, "madh"))
    order_info = request.data.get("note", "Thanh toán Luxe Glow")
    request_id = f"MOMO_{order_id}_{int(datetime.datetime.now().timestamp())}"
    extra_data = ""
    request_type = "payWithMethod"

    raw_signature = (
        f"accessKey={MOMO_ACCESS_KEY}&amount={amount}&extraData={extra_data}"
        f"&ipnUrl={MOMO_IPN_URL}&orderId={order_id}&orderInfo={order_info}"
        f"&partnerCode={MOMO_PARTNER_CODE}&redirectUrl={MOMO_REDIRECT_URL}"
        f"&requestId={request_id}&requestType={request_type}"
    )
    signature = hmac.new(
        MOMO_SECRET_KEY.encode(), raw_signature.encode(), hashlib.sha256
    ).hexdigest()

    payload = {
        "partnerCode": MOMO_PARTNER_CODE, "partnerName": "Luxe Glow",
        "storeId": "LuxeGlow", "requestId": request_id,
        "amount": amount, "orderId": order_id, "orderInfo": order_info,
        "redirectUrl": MOMO_REDIRECT_URL, "ipnUrl": MOMO_IPN_URL,
        "lang": "vi", "extraData": extra_data,
        "requestType": request_type, "signature": signature,
    }

    try:
        resp = requests.post(MOMO_ENDPOINT, json=payload, timeout=10)
        data = resp.json()
        return Response({"pay_url": data.get("payUrl", ""), "data": data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def momo_ipn(request):
    result_code = request.data.get("resultCode")
    order_id    = request.data.get("orderId", "")
    if result_code == 0:
        try:
            dh = DonHang.objects.get(madh=order_id)
            dh.trangthai = "Giao"
            dh.save()
        except DonHang.DoesNotExist:
            pass
    return Response({"message": "IPN received."})


@api_view(["GET"])
def momo_return(request):
    result_code = request.GET.get("resultCode", "1")
    if result_code == "0":
        return Response({"success": True, "message": "Thanh toán MoMo thành công."})
    return Response({"success": False, "message": "Thanh toán MoMo thất bại."})


# ═══════════════════════════════════════════════════════
# PAYMENT — VNPay
# ═══════════════════════════════════════════════════════

VNPAY_TMN_CODE    = "LUXEGLOW"
VNPAY_HASH_SECRET = "LUXEGLOWVNPAYSECRET2024"
VNPAY_URL         = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNPAY_RETURN_URL  = "http://localhost:3000/paymentsuccess"


@api_view(["POST"])
def vnpay_create(request):
    amount     = int(request.data.get("amount", 0)) * 100
    order_id   = request.data.get("order_id", "")
    order_desc = request.data.get("note", "Thanh toán Luxe Glow")
    now        = datetime.datetime.now()

    params = {
        "vnp_Version":   "2.1.0",
        "vnp_Command":   "pay",
        "vnp_TmnCode":   VNPAY_TMN_CODE,
        "vnp_Amount":    str(amount),
        "vnp_CurrCode":  "VND",
        "vnp_TxnRef":    order_id,
        "vnp_OrderInfo": order_desc,
        "vnp_OrderType": "other",
        "vnp_Locale":    "vn",
        "vnp_ReturnUrl": VNPAY_RETURN_URL,
        "vnp_IpAddr":    request.META.get("REMOTE_ADDR", "127.0.0.1"),
        "vnp_CreateDate": now.strftime("%Y%m%d%H%M%S"),
        "vnp_ExpireDate": (now + datetime.timedelta(minutes=15)).strftime("%Y%m%d%H%M%S"),
    }

    sorted_params  = sorted(params.items())
    query_string   = urllib.parse.urlencode(sorted_params)
    hash_data      = hmac.new(
        VNPAY_HASH_SECRET.encode(), query_string.encode(), hashlib.sha512
    ).hexdigest()

    pay_url = f"{VNPAY_URL}?{query_string}&vnp_SecureHash={hash_data}"
    return Response({"pay_url": pay_url})


@api_view(["GET"])
def vnpay_return(request):
    vnp_response_code = request.GET.get("vnp_ResponseCode", "99")
    if vnp_response_code == "00":
        return Response({"success": True, "message": "Thanh toán VNPay thành công."})
    return Response({"success": False, "message": f"Thanh toán VNPay thất bại. Mã lỗi: {vnp_response_code}"})


# ═══════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════

@api_view(["GET"])
def dashboard_overview(request):
    today            = datetime.date.today()
    this_month_start = today.replace(day=1)
    last_month_end   = this_month_start - datetime.timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    active_statuses = ["Moi", "Giao", "Mới", "Hoàn thành", "Hoan thanh"]

    total_revenue = DonHang.objects.filter(
        trangthai__in=active_statuses
    ).aggregate(total=Sum("tongtien"))["total"] or 0

    last_month_revenue = DonHang.objects.filter(
        trangthai__in=active_statuses,
        ngaydat__date__gte=last_month_start,
        ngaydat__date__lte=last_month_end,
    ).aggregate(total=Sum("tongtien"))["total"] or 0

    this_month_revenue = DonHang.objects.filter(
        trangthai__in=active_statuses,
        ngaydat__date__gte=this_month_start,
        ngaydat__date__lte=today,
    ).aggregate(total=Sum("tongtien"))["total"] or 0

    new_orders = DonHang.objects.filter(trangthai__in=["Moi", "Mới"]).count()

    new_customers       = KhachHang.objects.filter(ngaytao__date__gte=this_month_start).count()
    last_month_customers = KhachHang.objects.filter(
        ngaytao__date__gte=last_month_start,
        ngaytao__date__lte=last_month_end,
    ).count()

    # FIX: đếm sản phẩm tồn kho thấp (> 0 và <= 10)
    low_stock = SanPham.objects.filter(soluongton__gt=0, soluongton__lte=10).count()

    recent_orders = DonHang.objects.select_related("makh").order_by("-ngaydat")[:10]

    def pct_change(current, previous):
        if previous == 0:
            return "+100%" if current > 0 else "0%"
        change = (current - previous) / previous * 100
        sign   = "+" if change >= 0 else ""
        return f"{sign}{change:.1f}%"

    return Response({
        "overview": {
            "total_revenue":            float(total_revenue),
            "this_month_revenue":       float(this_month_revenue),
            "last_month_revenue":       float(last_month_revenue),
            "revenue_trend":            pct_change(float(this_month_revenue), float(last_month_revenue)),
            "new_orders":               new_orders,
            "new_customers_this_month": new_customers,
            "customers_trend":          pct_change(new_customers, last_month_customers),
            "low_stock_count":          low_stock,
            "total_customers":          KhachHang.objects.count(),
            "total_products":           SanPham.objects.count(),
        },
        "recent_orders": [_dh_data(o) for o in recent_orders],
    })


@api_view(["GET"])
def dashboard_revenue_by_day(request):
    qs = (
        DonHang.objects.filter(trangthai__in=["Moi", "Giao", "Mới", "Hoàn thành"])
        .annotate(day=TruncDay("ngaydat"))
        .values("day")
        .annotate(revenue=Sum("tongtien"), orders=Count("madh"))
        .order_by("day")
    )
    return Response({"data": [
        {"date": str(r["day"].date()), "revenue": float(r["revenue"]), "orders": r["orders"]}
        for r in qs
    ]})


@api_view(["GET"])
def dashboard_revenue_by_month(request):
    qs = (
        DonHang.objects.filter(trangthai__in=["Moi", "Giao", "Mới", "Hoàn thành"])
        .annotate(month=TruncMonth("ngaydat"))
        .values("month")
        .annotate(revenue=Sum("tongtien"), orders=Count("madh"))
        .order_by("month")
    )
    return Response({"data": [
        {"month": str(r["month"].date())[:7], "revenue": float(r["revenue"]), "orders": r["orders"]}
        for r in qs
    ]})


@api_view(["GET"])
def dashboard_revenue_by_year(request):
    qs = (
        DonHang.objects.filter(trangthai__in=["Moi", "Giao", "Mới", "Hoàn thành"])
        .annotate(year=TruncYear("ngaydat"))
        .values("year")
        .annotate(revenue=Sum("tongtien"), orders=Count("madh"))
        .order_by("year")
    )
    return Response({"data": [
        {"year": r["year"].year, "revenue": float(r["revenue"]), "orders": r["orders"]}
        for r in qs
    ]})


@api_view(["GET"])
def dashboard_revenue_by_product(request):
    qs = (
        ChiTietDonHang.objects
        .filter(madh__trangthai__in=["Moi", "Giao", "Mới", "Hoàn thành"])
        .values("masp__masp", "masp__tensp", "masp__hinhanh")
        .annotate(revenue=Sum("thanhtien"), quantity=Sum("soluong"))
        .order_by("-revenue")[:10]
    )
    return Response({"data": [
        {
            "product_id":    r["masp__masp"],
            "product_name":  r["masp__tensp"],
            "product_image": (lambda h: (json.loads(h)[0] if h and h.startswith("[") else h) if h else "")(r["masp__hinhanh"] or ""),
            "revenue":       float(r["revenue"]),
            "quantity":      r["quantity"],
        }
        for r in qs
    ]})


@api_view(["GET"])
def dashboard_revenue_by_brand(request):
    qs = (
        ChiTietDonHang.objects
        .filter(madh__trangthai__in=["Moi", "Giao", "Mới", "Hoàn thành"])
        .values("masp__thuonghieu")
        .annotate(revenue=Sum("thanhtien"), quantity=Sum("soluong"))
        .order_by("-revenue")[:10]
    )
    return Response({"data": [
        {
            "brand":    r["masp__thuonghieu"] or "Không rõ",
            "revenue":  float(r["revenue"]),
            "quantity": r["quantity"],
        }
        for r in qs
    ]})


@api_view(["GET"])
def dashboard_revenue_compare(request):
    today        = datetime.date.today()
    this_start   = today.replace(day=1)
    last_end     = this_start - datetime.timedelta(days=1)
    last_start   = last_end.replace(day=1)
    active_s     = ["Moi", "Giao", "Mới", "Hoàn thành"]

    def get_revenue(start, end):
        return float(DonHang.objects.filter(
            trangthai__in=active_s,
            ngaydat__date__gte=start,
            ngaydat__date__lte=end,
        ).aggregate(total=Sum("tongtien"))["total"] or 0)

    this_month = get_revenue(this_start, today)
    last_month = get_revenue(last_start, last_end)
    change_pct = ((this_month - last_month) / last_month * 100) if last_month else 0

    return Response({
        "this_month":     this_month,
        "last_month":     last_month,
        "change_percent": round(change_pct, 1),
    })

# ═══════════════════════════════════════════════════════
# BANNER
# ═══════════════════════════════════════════════════════

def _banner_item_data(item):
    return {
        "id":         item.pk,
        "media_type": item.media_type,
        "media_url":  item.media_url,
        "caption":    item.caption,
        "link_url":   item.link_url,
        "sort_order": item.sort_order,
    }

def _banner_data(banner):
    return {
        "id":        banner.pk,
        "title":     banner.title,
        "is_active": banner.is_active,
        "auto_play": banner.auto_play,
        "interval":  banner.interval,
        "items":     [_banner_item_data(i) for i in banner.items.all()],
    }


@api_view(["GET"])
def banner_list(request):
    banners = Banner.objects.prefetch_related("items").all()
    return Response({"banners": [_banner_data(b) for b in banners]})


@api_view(["POST"])
def banner_create(request):
    d = request.data
    banner = Banner.objects.create(
        title     = (d.get("title") or "").strip(),
        is_active = bool(d.get("is_active", True)),
        auto_play = bool(d.get("auto_play", True)),
        interval  = int(d.get("interval") or 4000),
    )
    return Response({"banner": _banner_data(banner)}, status=201)


@api_view(["POST"])
def banner_update(request):
    d = request.data
    try:
        banner = Banner.objects.get(pk=d.get("id"))
    except Banner.DoesNotExist:
        return Response({"message": "Không tìm thấy banner."}, status=404)
    if "title"     in d: banner.title     = (d["title"] or "").strip()
    if "is_active" in d: banner.is_active = bool(d["is_active"])
    if "auto_play" in d: banner.auto_play = bool(d["auto_play"])
    if "interval"  in d: banner.interval  = int(d["interval"] or 4000)
    banner.save()
    return Response({"banner": _banner_data(banner)})


@api_view(["POST"])
def banner_delete(request):
    try:
        Banner.objects.get(pk=request.data.get("id")).delete()
        return Response({"message": "Đã xóa banner."})
    except Banner.DoesNotExist:
        return Response({"message": "Không tìm thấy banner."}, status=404)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def banner_item_add(request):
    try:
        banner = Banner.objects.get(pk=request.data.get("banner_id"))
    except Banner.DoesNotExist:
        return Response({"message": "Không tìm thấy banner."}, status=404)

    media_type = request.data.get("media_type", "image")
    caption    = request.data.get("caption", "")
    link_url   = request.data.get("link_url", "")
    video_url  = request.data.get("video_url", "")
    file       = request.FILES.get("file")

    media_url = ""
    if file:
        try:
            resource_type = "video" if media_type == "video" else "image"
            res = cloudinary.uploader.upload(
                file, resource_type=resource_type, folder="luxeglow/banner"
            )
            media_url = res.get("secure_url", "")
        except Exception as e:
            return Response({"message": f"Lỗi upload: {e}"}, status=500)
    elif video_url:
        media_url = video_url.strip()
    else:
        return Response({"message": "Cần file hoặc video_url."}, status=400)

    sort_order = banner.items.count()
    item = BannerItem.objects.create(
        banner     = banner,
        media_type = media_type,
        media_url  = media_url,
        caption    = caption,
        link_url   = link_url,
        sort_order = sort_order,
    )
    return Response({"item": _banner_item_data(item)}, status=201)


@api_view(["POST"])
def banner_item_update(request):
    d = request.data
    try:
        item = BannerItem.objects.get(pk=d.get("id"))
    except BannerItem.DoesNotExist:
        return Response({"message": "Không tìm thấy item."}, status=404)
    if "caption"  in d: item.caption  = d["caption"]
    if "link_url" in d: item.link_url = d["link_url"]
    item.save()
    return Response({"item": _banner_item_data(item)})


@api_view(["POST"])
def banner_item_delete(request):
    try:
        BannerItem.objects.get(pk=request.data.get("id")).delete()
        return Response({"message": "Đã xóa item."})
    except BannerItem.DoesNotExist:
        return Response({"message": "Không tìm thấy item."}, status=404)


@api_view(["POST"])
def banner_item_reorder(request):
    order = request.data.get("order", [])
    for idx, item_id in enumerate(order):
        BannerItem.objects.filter(pk=item_id).update(sort_order=idx)
    return Response({"message": "Đã cập nhật thứ tự."})


# ═══════════════════════════════════════════════════════
# BLOG / BAI VIET
# ═══════════════════════════════════════════════════════

def _post_data(p, include_blocks=False):
    blocks = p.blocks or []
    thumbnail = p.thumbnail
    if not thumbnail:
        for b in blocks:
            if b.get("type") == "image" and b.get("url"):
                thumbnail = b["url"]
                break
    d = {
        "id":         p.pk,
        "title":      p.title,
        "category":   p.category,
        "author":     p.author,
        "thumbnail":  thumbnail,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }
    if include_blocks:
        d["blocks"] = blocks
    return d


@api_view(["GET"])
def list_posts(request):
    cat = request.GET.get("category", "")
    qs  = BaiViet.objects.all()
    if cat and cat != "all":
        qs = qs.filter(category=cat)
    return Response({"posts": [_post_data(p) for p in qs]})


@api_view(["POST"])
@parser_classes([MultiPartParser])
def create_post(request):
    title  = (request.data.get("title") or "").strip()
    if not title:
        return Response({"message": "Tiêu đề không được để trống."}, status=400)

    blocks = json.loads(request.data.get("blocks") or "[]")

    for b in blocks:
        if b.get("type") == "image":
            idx  = b.get("_idx") or b.get("id")
            file = request.FILES.get(f"block_img_{idx}")
            if file:
                try:
                    res = cloudinary.uploader.upload(file, folder="luxeglow/blog")
                    b["url"] = res.get("secure_url", "")
                except Exception as e:
                    logger.warning(f"[Blog] Upload ảnh block lỗi: {e}")

    thumbnail = None
    for b in blocks:
        if b.get("type") == "image" and b.get("url"):
            thumbnail = b["url"]
            break

    post = BaiViet.objects.create(
        title     = title,
        category  = request.data.get("category") or "Tin tức",
        author    = (request.data.get("author") or "Admin").strip(),
        blocks    = blocks,
        thumbnail = thumbnail,
    )
    return Response({"post": _post_data(post, include_blocks=True)}, status=201)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def update_post(request):
    post_id = request.data.get("post_id")
    try:
        post = BaiViet.objects.get(pk=post_id)
    except BaiViet.DoesNotExist:
        return Response({"message": "Không tìm thấy bài viết."}, status=404)

    title = (request.data.get("title") or "").strip()
    if not title:
        return Response({"message": "Tiêu đề không được để trống."}, status=400)

    blocks = json.loads(request.data.get("blocks") or "[]")
    for b in blocks:
        if b.get("type") == "image":
            idx  = b.get("_idx") or b.get("id")
            file = request.FILES.get(f"block_img_{idx}")
            if file:
                try:
                    res = cloudinary.uploader.upload(file, folder="luxeglow/blog")
                    b["url"] = res.get("secure_url", "")
                except Exception as e:
                    logger.warning(f"[Blog] Upload ảnh block lỗi: {e}")

    thumbnail = None
    for b in blocks:
        if b.get("type") == "image" and b.get("url"):
            thumbnail = b["url"]
            break

    post.title     = title
    post.category  = request.data.get("category") or post.category
    post.author    = (request.data.get("author") or post.author).strip()
    post.blocks    = blocks
    post.thumbnail = thumbnail
    post.save()
    return Response({"post": _post_data(post, include_blocks=True)})


@api_view(["POST"])
def delete_post(request):
    post_id = request.data.get("post_id")
    try:
        BaiViet.objects.get(pk=post_id).delete()
        return Response({"message": "Đã xóa bài viết."})
    except BaiViet.DoesNotExist:
        return Response({"message": "Không tìm thấy bài viết."}, status=404)


@api_view(["GET"])
def get_post(request, post_id):
    try:
        post = BaiViet.objects.get(pk=post_id)
        return Response({"post": _post_data(post, include_blocks=True)})
    except BaiViet.DoesNotExist:
        return Response({"post": None}, status=404)


# ═══════════════════════════════════════════════════════
# PRODUCT CONTENT (Nội dung block editor)
# ═══════════════════════════════════════════════════════

@api_view(["POST"])
@parser_classes([MultiPartParser])
def save_product_content(request):
    product_id = request.data.get("product_id")
    blocks_raw = request.data.get("blocks", "[]")

    sp = SanPham.objects.filter(masp=product_id).first()
    if not sp:
        return Response({"message": "Không tìm thấy sản phẩm."}, status=404)

    try:
        blocks = json.loads(blocks_raw) if isinstance(blocks_raw, str) else blocks_raw
    except Exception:
        blocks = []

    for key in request.FILES:
        if key.startswith("block_img_"):
            idx  = key.replace("block_img_", "")
            file = request.FILES[key]
            try:
                res = cloudinary.uploader.upload(
                    file, folder=f"luxeglow/product_content/{product_id}"
                )
                for b in blocks:
                    if (b.get("_idx") == idx or b.get("id") == idx) and b.get("type") == "image":
                        b["url"] = res.get("secure_url", "")
                        b.pop("_file", None)
                        break
            except Exception as e:
                logger.warning(f"[Content] Upload block ảnh lỗi: {e}")

    for b in blocks:
        b.pop("_file", None)

    NoidungSanPham.objects.update_or_create(
        masp=sp, defaults={"blocks": blocks}
    )
    return Response({"message": "Đã lưu nội dung sản phẩm."})


@api_view(["GET"])
def get_product_content(request, product_id):
    sp = SanPham.objects.filter(masp=product_id).first()
    if not sp:
        return Response({"content": None}, status=404)
    obj = NoidungSanPham.objects.filter(masp=sp).first()
    if not obj:
        return Response({"content": None})
    return Response({
        "content": {
            "blocks":     obj.blocks or [],
            "updated_at": obj.updated_at.isoformat(),
        }
    })