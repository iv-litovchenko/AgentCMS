#!/usr/bin/env python3
"""CRM Analytics Chart Generator"""
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from datetime import datetime

# Data from CRM
dates = ['2026-08-16\n(Вос)', '2026-08-17\n(Пон)', '2026-08-18\n(Вто)']
appointments = [2, 1, 0]
revenue = [3500, 3500, 0]

# Create figure with 2 subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 10))
fig.suptitle('CRM Studio — Аналитика (Август 2026)', fontsize=16, fontweight='bold')

# Subplot 1: Bar chart - Appointments per day
bars1 = ax1.bar(dates, appointments, color=['#3498db', '#2ecc71', '#e74c3c'], alpha=0.8)
ax1.set_ylabel('Количество записей', fontsize=12)
ax1.set_title('Записи по дням', fontsize=14)
ax1.set_ylim(0, max(appointments) + 1)
for bar in bars1:
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height,
             f'{int(height)}', ha='center', va='bottom', fontsize=11, fontweight='bold')
ax1.grid(axis='y', alpha=0.3)

# Subplot 2: Bar chart - Revenue per day
bars2 = ax2.bar(dates, revenue, color=['#9b59b6', '#1abc9c', '#95a5a6'], alpha=0.8)
ax2.set_ylabel('Выручка (руб)', fontsize=12)
ax2.set_title('Выручка по дням', fontsize=14)
ax2.set_ylim(0, max(revenue) + 1000)
for bar in bars2:
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height,
             f'{int(height)}', ha='center', va='bottom', fontsize=11, fontweight='bold')
ax2.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('crm-analytics.png', dpi=150, bbox_inches='tight')
print("Chart saved: crm-analytics.png")
