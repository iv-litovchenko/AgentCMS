<?php
declare(strict_types=1);
?>
<section class="rp-widget-diag-wrap" aria-labelledby="home-widget-diag-title">
  <h2 id="home-widget-diag-title" class="rp-widget-diag-head">Примеры типов диаграмм для виджета (макеты превью, mock)</h2>
  <p class="rp-widget-diag-lead muted">Чисто визуальные заготовки: в конфиге виджета хранится <code>chartType</code> + стили; рендер на фронте через ECharts / Chart.js по тем же типам.</p>
  <div class="rp-widget-diag-gallery">
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Столбцы (bar)</div>
      <div class="rp-chart-mock">
        <div class="rp-chart-bars rp-chart-bars--sm">
          <span class="rp-chart-bar"></span><span class="rp-chart-bar"></span><span class="rp-chart-bar"></span><span class="rp-chart-bar"></span>
        </div>
        <div class="rp-chart-labels"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>
      </div>
      <p class="rp-widget-diag-card__hint"><code>chartType: bar</code> · категории по оси X</p>
    </div>
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Линия (line)</div>
      <svg class="rp-chart-line-svg" viewBox="0 0 120 80" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="rpHomeLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4361ee" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#4361ee" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="#c5cae9" stroke-width="1" points="0,65 30,50 60,55 90,30 120,40"/>
        <polyline fill="none" stroke="#4361ee" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="0,70 24,52 48,58 72,38 96,22 120,35"/>
      </svg>
      <p class="rp-widget-diag-card__hint"><code>chartType: line</code> · тренды во времени</p>
    </div>
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Область (area)</div>
      <svg class="rp-chart-area-svg" viewBox="0 0 120 80" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="rpHomeAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4361ee" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#4361ee" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
        <path fill="url(#rpHomeAreaFill)" stroke="#4361ee" stroke-width="1.5" d="M0,75 L20,55 L40,62 L60,40 L80,48 L100,25 L120,38 L120,80 L0,80 Z"/>
      </svg>
      <p class="rp-widget-diag-card__hint"><code>chartType: area</code> · заливка под линией</p>
    </div>
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Круговая (pie)</div>
      <div class="rp-chart-pie" role="img" aria-label="pie mock"></div>
      <p class="rp-widget-diag-card__hint"><code>chartType: pie</code> · доли 100%</p>
    </div>
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Кольцо (donut)</div>
      <div class="rp-chart-donut" role="img" aria-label="donut mock"></div>
      <p class="rp-widget-diag-card__hint"><code>chartType: donut</code> · легенда в центре</p>
    </div>
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Горизонтальные bar</div>
      <div class="rp-chart-hbars">
        <div class="rp-chart-hbars__row"><span>A</span><i></i></div>
        <div class="rp-chart-hbars__row"><span>B</span><i></i></div>
        <div class="rp-chart-hbars__row"><span>C</span><i></i></div>
      </div>
      <p class="rp-widget-diag-card__hint"><code>chartType: bar_horizontal</code> · рейтинги</p>
    </div>
    <div class="rp-widget-diag-card">
      <div class="rp-widget-diag-card__title">Радар (spider)</div>
      <div class="rp-chart-radar-mock" role="img" aria-label="radar mock"></div>
      <p class="rp-widget-diag-card__hint"><code>chartType: radar</code> · несколько метрик</p>
    </div>
  </div>
</section>
