# Generated by Django 5.1.1 on 2024-11-12 00:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0007_presupuestoti_costo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ticket',
            name='sla_status',
            field=models.CharField(blank=True, default='On Track', max_length=40, null=True),
        ),
    ]