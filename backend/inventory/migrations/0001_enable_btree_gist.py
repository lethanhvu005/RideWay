"""Migration to enable PostgreSQL GiST equality support before model constraints."""
from django.contrib.postgres.operations import BtreeGistExtension
from django.db import migrations


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [BtreeGistExtension()]
