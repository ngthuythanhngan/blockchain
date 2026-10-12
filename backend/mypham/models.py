from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class DanhMuc(models.Model):
    madm = models.CharField(max_length=10, primary_key=True)
    tendm = models.CharField(max_length=50)
    mota = models.CharField(max_length=200, null=True, blank=True)
    hinhanh = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = 'DANHMUC'

    def __str__(self):
        return self.tendm


class SanPham(models.Model):
    masp = models.CharField(max_length=10, primary_key=True)
    tensp = models.CharField(max_length=100)
    madm = models.ForeignKey(DanhMuc, on_delete=models.RESTRICT, db_column='MADM')
    giaban = models.IntegerField(validators=[MinValueValidator(1)])
    soluongton = models.IntegerField(validators=[MinValueValidator(0)])
    thuonghieu = models.CharField(max_length=50, null=True, blank=True)
    hansudung = models.DateField()
    hinhanh = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'SANPHAM'

    def __str__(self):
        return self.tensp


class KhachHang(models.Model):
    LOAI_DANGNHAP_CHOICES = [
        ('normal', 'Thường'),
        ('google', 'Google'),
    ]

    makh         = models.CharField(max_length=10, primary_key=True)
    hoten        = models.CharField(max_length=50)
    email        = models.EmailField(max_length=100, unique=True)
    matkhau      = models.CharField(max_length=255, null=True, blank=True)  # null nếu đăng nhập Google
    sdt          = models.CharField(max_length=15, null=True, blank=True)
    diachi       = models.CharField(max_length=200, null=True, blank=True)
    ngaysinh     = models.DateField(null=True, blank=True)
    avatar       = models.TextField(null=True, blank=True)                  # URL ảnh Google hoặc Cloudinary
    google_id    = models.CharField(max_length=100, null=True, blank=True, unique=True)
    loaidangnhap = models.CharField(max_length=20, choices=LOAI_DANGNHAP_CHOICES, default='normal')
    ngaytao      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'KHACHHANG'

    def __str__(self):
        return self.hoten


class KhuyenMai(models.Model):
    LOAI_GIAM_CHOICES = [
        ('%', '%'),
        ('VND', 'VND'),
    ]

    makm = models.CharField(max_length=10, primary_key=True)
    tenkm = models.CharField(max_length=100)
    magiamgia = models.CharField(max_length=20, unique=True)
    loaigiam = models.CharField(max_length=20, choices=LOAI_GIAM_CHOICES)
    giatrigiam = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(0.01)])
    ngaybatdau = models.DateField()
    ngayketthuc = models.DateField()
    soluotdung = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    gioihandung = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])

    class Meta:
        db_table = 'KHUYEN_MAI'

    def __str__(self):
        return self.tenkm


class Admin(models.Model):
    QUYEN_HAN_CHOICES = [
        (0, 'Nhân viên'),
        (1, 'Quản trị viên'),
    ]

    maadmin = models.CharField(max_length=10, primary_key=True)
    tendangnhap = models.CharField(max_length=50, unique=True)
    matkhau = models.CharField(max_length=255)
    hoten = models.CharField(max_length=50)
    quyenhan = models.IntegerField(choices=QUYEN_HAN_CHOICES)

    class Meta:
        db_table = 'ADMIN'

    def __str__(self):
        return self.hoten


class DonHang(models.Model):
    TRANG_THAI_CHOICES = [
        ('Mới', 'Mới'),
        ('Giao', 'Giao'),
        ('Hủy', 'Hủy'),
    ]

    madh = models.CharField(max_length=10, primary_key=True)
    makh = models.ForeignKey(KhachHang, on_delete=models.RESTRICT, db_column='MAKH')
    makm = models.ForeignKey(KhuyenMai, on_delete=models.SET_NULL, null=True, blank=True, db_column='MAKM')
    sotiengiam = models.DecimalField(max_digits=18, decimal_places=2)
    ngaydat = models.DateTimeField()
    tongtien = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(0)])
    trangthai = models.CharField(max_length=50, choices=TRANG_THAI_CHOICES)
    diachigiao = models.CharField(max_length=200)

    class Meta:
        db_table = 'DONHANG'

    def __str__(self):
        return self.madh


class ChiTietDonHang(models.Model):
    madh = models.ForeignKey(DonHang, on_delete=models.RESTRICT, db_column='MADH')
    masp = models.ForeignKey(SanPham, on_delete=models.RESTRICT, db_column='MASP')
    soluong = models.IntegerField(validators=[MinValueValidator(1)])
    dongia = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(0)])
    thanhtien = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        db_table = 'CHITIETDONHANG'
        unique_together = ('madh', 'masp')

    def __str__(self):
        return f"{self.madh} - {self.masp}"


class GioHang(models.Model):
    TRANG_THAI_CHOICES = [
        ('Active', 'Active'),
        ('Đã đặt', 'Đã đặt'),
    ]

    magh = models.CharField(max_length=10, primary_key=True)
    makh = models.OneToOneField(KhachHang, on_delete=models.RESTRICT, db_column='MAKH')
    ngaytao = models.DateTimeField(auto_now_add=True)
    trangthai = models.CharField(max_length=20, choices=TRANG_THAI_CHOICES)

    class Meta:
        db_table = 'GIO_HANG'

    def __str__(self):
        return self.magh


class ChiTietGioHang(models.Model):
    magh = models.ForeignKey(GioHang, on_delete=models.CASCADE, db_column='MAGH')
    masp = models.ForeignKey(SanPham, on_delete=models.RESTRICT, db_column='MASP')
    soluong = models.IntegerField(validators=[MinValueValidator(1)])
    ngaythem = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'CHI_TIET_GIO_HANG'
        unique_together = ('magh', 'masp')

    def __str__(self):
        return f"{self.magh} - {self.masp}"


class DanhGia(models.Model):
    TRANG_THAI_CHOICES = [
        ('Hiển thị', 'Hiển thị'),
        ('Ẩn', 'Ẩn'),
    ]

    madg = models.CharField(max_length=10, primary_key=True)
    makh = models.ForeignKey(KhachHang, on_delete=models.RESTRICT, db_column='MAKH')
    masp = models.ForeignKey(SanPham, on_delete=models.RESTRICT, db_column='MASP')
    diemdanhgia = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    noidung = models.CharField(max_length=500, null=True, blank=True)
    ngaydanhgia = models.DateTimeField(auto_now_add=True)
    trangthai = models.CharField(max_length=20, choices=TRANG_THAI_CHOICES)

    class Meta:
        db_table = 'DANH_GIA'

    def __str__(self):
        return f"{self.makh} - {self.masp} - {self.diemdanhgia}★"

# ═══════════════════════════════════════════════════════
# BANNER
# ═══════════════════════════════════════════════════════

class Banner(models.Model):
    title      = models.CharField(max_length=200, blank=True, default='')
    is_active  = models.BooleanField(default=True)
    auto_play  = models.BooleanField(default=True)
    interval   = models.IntegerField(default=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'BANNER'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f'Banner #{self.pk}'


class BannerItem(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('image', 'Hình ảnh'),
        ('video', 'Video'),
    ]
    banner     = models.ForeignKey(Banner, on_delete=models.CASCADE, related_name='items')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='image')
    media_url  = models.TextField()
    caption    = models.CharField(max_length=300, blank=True, default='')
    link_url   = models.CharField(max_length=500, blank=True, default='')
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'BANNER_ITEM'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.banner} — {self.media_type} #{self.pk}'


# ═══════════════════════════════════════════════════════
# BAI VIET (Blog)
# ═══════════════════════════════════════════════════════

class BaiViet(models.Model):
    CATEGORY_CHOICES = [
        ('Mẹo vặt',   'Mẹo vặt'),
        ('Đánh giá',  'Đánh giá'),
        ('Tin tức',   'Tin tức'),
        ('Hướng dẫn', 'Hướng dẫn'),
    ]
    title      = models.CharField(max_length=300)
    category   = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Tin tức')
    author     = models.CharField(max_length=100, default='Admin')
    blocks     = models.JSONField(default=list)
    thumbnail  = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'BAI_VIET'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# ═══════════════════════════════════════════════════════
# NOIDUNG SAN PHAM (Product Content Blocks)
# ═══════════════════════════════════════════════════════

class NoidungSanPham(models.Model):
    masp       = models.OneToOneField(
        SanPham, on_delete=models.CASCADE,
        db_column='MASP', related_name='noidung'
    )
    blocks     = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'NOIDUNG_SANPHAM'

    def __str__(self):
        return f'Nội dung: {self.masp_id}'

# ═══════════════════════════════════════════════════════
# DANH GIA MO RONG (Review Media + Reply)
# ═══════════════════════════════════════════════════════

class DanhGiaMedia(models.Model):
    """Ảnh/video đính kèm đánh giá"""
    MEDIA_TYPE = [('image', 'Hình ảnh'), ('video', 'Video')]
    review      = models.ForeignKey('DanhGia', on_delete=models.CASCADE, related_name='media_items')
    media_type  = models.CharField(max_length=10, choices=MEDIA_TYPE, default='image')
    url         = models.TextField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'DANH_GIA_MEDIA'

    def __str__(self):
        return f'{self.review_id} - {self.media_type}'


class DanhGiaReply(models.Model):
    """Admin trả lời đánh giá (có thể kèm ảnh/video)"""
    review      = models.ForeignKey('DanhGia', on_delete=models.CASCADE, related_name='replies')
    admin       = models.ForeignKey('Admin', on_delete=models.SET_NULL, null=True, blank=True)
    content     = models.TextField()
    media       = models.JSONField(default=list)   # [{type, url}]
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'DANH_GIA_REPLY'

    def __str__(self):
        return f'Reply → {self.review_id}'


# ═══════════════════════════════════════════════════════
# BINH LUAN (Comment + nested reply + like + media)
# ═══════════════════════════════════════════════════════

class BinhLuan(models.Model):
    """Bình luận sản phẩm, có thể lồng nhau (parent)"""
    masp        = models.ForeignKey(SanPham,   on_delete=models.CASCADE, db_column='MASP', related_name='comments')
    makh        = models.ForeignKey(KhachHang, on_delete=models.CASCADE, db_column='MAKH', null=True, blank=True)
    parent      = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    content     = models.TextField()
    media       = models.JSONField(default=list)   # [{type:'image'|'video', url:'...'}]
    like_count  = models.IntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'BINH_LUAN'
        ordering = ['-created_at']

    def __str__(self):
        return f'BL-{self.id} → {self.masp_id}'


class BinhLuanLike(models.Model):
    """User like bình luận (1 user 1 lần mỗi comment)"""
    comment     = models.ForeignKey(BinhLuan,  on_delete=models.CASCADE, related_name='likes')
    makh        = models.ForeignKey(KhachHang, on_delete=models.CASCADE, db_column='MAKH')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'BINH_LUAN_LIKE'
        unique_together = ('comment', 'makh')

    def __str__(self):
        return f'Like: {self.makh_id} → {self.comment_id}'


class AdminBinhLuanReply(models.Model):
    """Admin trả lời bình luận (kèm ảnh/video)"""
    comment     = models.ForeignKey(BinhLuan, on_delete=models.CASCADE, related_name='admin_replies')
    admin       = models.ForeignKey('Admin', on_delete=models.SET_NULL, null=True, blank=True)
    content     = models.TextField()
    media       = models.JSONField(default=list)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ADMIN_BINH_LUAN_REPLY'

    def __str__(self):
        return f'AdminReply → {self.comment_id}'