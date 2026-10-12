"""
migrations/0002_danhmuc_hinhanh.py
Thêm cột HINHANH vào bảng DANHMUC.

Chạy: python manage.py migrate
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mypham", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="danhmuc",
            name="hinhanh",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
