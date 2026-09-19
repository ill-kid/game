/**
 * 飞行棋 · 可拖动浮窗
 * 独立模块，方便别的页面 / 机端接入
 *
 * 用法：
 *   1. 页面里放一个 #floatBar 元素
 *   2. 引入本文件
 *   3. FlightFloat.init({ onRestore: () => { ... } })
 *   4. FlightFloat.show() / FlightFloat.hide()
 *   5. FlightFloat.setPosText('你18 · 机15')
 *
 * 交互：
 *   - 拖动：按住拖到任意位置（不会拖出屏幕）
 *   - 单击（几乎没移动）：触发 onRestore 恢复弹窗
 */

(function (global) {
  const DRAG_THRESHOLD = 8; // px，小于此视为点击

  const FlightFloat = {
    el: null,
    _dragging: false,
    _moved: false,
    _startX: 0,
    _startY: 0,
    _origX: 0,
    _origY: 0,
    _onRestore: null,
    _bound: false,

    /**
     * @param {Object} opts
     * @param {string} [opts.selector='#floatBar']
     * @param {Function} [opts.onRestore] 单击浮窗时回调（恢复弹窗）
     */
    init(opts) {
      opts = opts || {};
      const sel = opts.selector || '#floatBar';
      this.el = document.querySelector(sel);
      if (!this.el) {
        console.warn('[FlightFloat] 找不到浮窗元素:', sel);
        return this;
      }
      this._onRestore = opts.onRestore || null;

      // 只写布局约束，不强制显示（避免一 init 就出现浮窗）
      const s = this.el.style;
      s.flexDirection = 'row';
      s.alignItems = 'center';
      s.width = 'auto';
      s.height = 'auto';
      s.maxHeight = '48px';
      s.flex = 'none';
      s.position = s.position || 'fixed';
      s.zIndex = s.zIndex || '40';
      s.touchAction = 'none';
      s.userSelect = 'none';

      if (!this._bound) {
        this._bindDrag();
        this._bound = true;
      }
      return this;
    },

    show() {
      if (!this.el) return;
      this.el.classList.add('show');
      // 同时写 style，避免仅依赖 CSS 时被其它规则盖住
      this.el.style.display = 'inline-flex';
      this.el.style.flexDirection = 'row';
      this.el.style.alignItems = 'center';
    },

    hide() {
      if (!this.el) return;
      this.el.classList.remove('show');
      this.el.style.display = 'none';
    },

    setPosText(text) {
      const span = this.el && this.el.querySelector('[data-float-pos]');
      if (span) span.textContent = text || '';
    },

    _clamp(x, y) {
      const bar = this.el;
      const w = bar.offsetWidth || 120;
      const h = bar.offsetHeight || 40;
      const maxX = Math.max(0, window.innerWidth - w - 4);
      const maxY = Math.max(0, window.innerHeight - h - 4);
      return {
        x: Math.min(maxX, Math.max(4, x)),
        y: Math.min(maxY, Math.max(4, y))
      };
    },

    _bindDrag() {
      const bar = this.el;
      const self = this;

      const onStart = (e) => {
        if (!bar || bar.style.display === 'none') return;
        // 忽略右键
        if (e.button != null && e.button !== 0) return;

        self._dragging = true;
        self._moved = false;
        const pt = e.touches ? e.touches[0] : e;
        self._startX = pt.clientX;
        self._startY = pt.clientY;
        const rect = bar.getBoundingClientRect();
        self._origX = rect.left;
        self._origY = rect.top;
        bar.style.right = 'auto';
        bar.style.bottom = 'auto';
        bar.style.left = self._origX + 'px';
        bar.style.top = self._origY + 'px';
        if (e.cancelable) e.preventDefault();
      };

      const onMove = (e) => {
        if (!self._dragging) return;
        const pt = e.touches ? e.touches[0] : e;
        const dx = pt.clientX - self._startX;
        const dy = pt.clientY - self._startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          self._moved = true;
        }
        if (!self._moved) return;
        const pos = self._clamp(self._origX + dx, self._origY + dy);
        bar.style.left = pos.x + 'px';
        bar.style.top = pos.y + 'px';
        if (e.cancelable) e.preventDefault();
      };

      const onEnd = (e) => {
        if (!self._dragging) return;
        const wasDrag = self._moved;
        self._dragging = false;
        // 几乎没移动 → 视为单击恢复
        if (!wasDrag && typeof self._onRestore === 'function') {
          self._onRestore();
        }
      };

      bar.addEventListener('mousedown', onStart);
      bar.addEventListener('touchstart', onStart, { passive: false });
      window.addEventListener('mousemove', onMove, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    }
  };

  global.FlightFloat = FlightFloat;
})(typeof window !== 'undefined' ? window : globalThis);
