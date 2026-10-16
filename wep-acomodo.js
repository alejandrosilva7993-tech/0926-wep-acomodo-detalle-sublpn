/* Flujo único: 2 SubLPN · 2 SKU — campos libres, resumen como texto */
(function () {
  'use strict';

  var STEPS = [
    'locOrigen',
    'lpnOrigen',
    'subLpnOrigen',
    'producto',
    'cantidad',
    'locDestino',
    'lpnDestino'
  ];

  var STEP_LABELS = {
    locOrigen: 'localidad origen',
    lpnOrigen: 'LPN origen',
    subLpnOrigen: 'SubLPN origen',
    producto: 'producto',
    cantidad: 'cantidad',
    locDestino: 'localidad destino',
    lpnDestino: 'LPN destino'
  };

  var SUGGESTED = ['SUB-1001-A', 'SUB-1001-B'];

  var state = {
    step: 'locOrigen',
    done: {},
    doneSubs: [],
    /** Decidido por backend (no se pregunta al usuario). */
    full: false,
    toastTimer: null
  };

  function $(id) { return document.getElementById(id); }

  function val(id) { return String($(id).value || '').trim(); }

  /**
   * El backend determina si la SubLPN se acomoda completa.
   * En este prototipo siempre es acomodo a detalle (producto + cantidad).
   */
  function resolveFullSubFromBackend(sub) {
    void sub;
    return false;
  }

  function showToast(msg, type) {
    var toast = $('toast');
    $('toastMsg').textContent = msg;
    toast.className = 'toast toast--' + (type || 'success');
    toast.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 3800);
    $('srLive').textContent = msg;
  }

  function setErr(id, msg) {
    var el = $(id);
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function requireValue(inputId, errId, label) {
    setErr(errId, '');
    var v = val(inputId);
    if (!v) {
      setErr(errId, 'Ingresa ' + label + '.');
      return null;
    }
    return v;
  }

  function nextSuggested() {
    return SUGGESTED.filter(function (s) {
      return state.doneSubs.indexOf(s) === -1;
    })[0] || ('SUB-' + (state.doneSubs.length + 1));
  }

  function stepEl(name) {
    return $('step-' + name);
  }

  function markDone(step, text) {
    state.done[step] = text;
    var el = stepEl(step);
    var editor = el.querySelector('[data-editor]');
    var done = el.querySelector('[data-done]');
    var summary = el.querySelector('[data-summary-text]');
    editor.hidden = true;
    done.hidden = false;
    summary.textContent = text;
    el.hidden = false;
  }

  function markActive(step) {
    var el = stepEl(step);
    el.hidden = false;
    var editor = el.querySelector('[data-editor]');
    var done = el.querySelector('[data-done]');
    editor.hidden = false;
    done.hidden = true;
  }

  function hideStep(step) {
    var el = stepEl(step);
    el.hidden = true;
    el.querySelector('[data-editor]').hidden = false;
    el.querySelector('[data-done]').hidden = true;
  }

  function visibleSteps() {
    if (state.full) {
      return STEPS.filter(function (s) {
        return s !== 'producto' && s !== 'cantidad';
      });
    }
    return STEPS.slice();
  }

  function render() {
    var steps = visibleSteps();
    var idx = steps.indexOf(state.step);

    STEPS.forEach(function (step) {
      if (steps.indexOf(step) === -1) {
        hideStep(step);
        return;
      }
      var i = steps.indexOf(step);
      if (i < idx && state.done[step]) {
        markDone(step, state.done[step]);
      } else if (i === idx) {
        markActive(step);
      } else {
        hideStep(step);
      }
    });

    if (state.step === 'subLpnOrigen') {
      var sug = nextSuggested();
      $('suggestValue').textContent = sug;
      if (!$('inputSubLpnOrigen').value) $('inputSubLpnOrigen').value = sug;
    }

    var esc = $('escHint');
    if (state.step === 'locOrigen' || idx <= 0) {
      esc.hidden = true;
    } else {
      var prevLabel = STEP_LABELS[steps[idx - 1]] || 'paso anterior';
      esc.hidden = false;
      esc.textContent = 'Esc (cambiar ' + prevLabel + ')';
    }

    var map = {
      locOrigen: 'inputLocOrigen',
      lpnOrigen: 'inputLpnOrigen',
      subLpnOrigen: 'inputSubLpnOrigen',
      producto: 'inputProducto',
      cantidad: 'inputCantidad',
      locDestino: 'inputLocDestino',
      lpnDestino: 'inputLpnDestino'
    };
    var input = $(map[state.step]);
    if (input) setTimeout(function () { input.focus(); }, 30);
  }

  function go(step) {
    state.step = step;
    render();
  }

  function confirmLoc() {
    var v = requireValue('inputLocOrigen', 'errLocOrigen', 'la localidad origen');
    if (!v) return;
    markDone('locOrigen', v);
    go('lpnOrigen');
  }

  function confirmLpn() {
    var v = requireValue('inputLpnOrigen', 'errLpnOrigen', 'la LPN origen');
    if (!v) return;
    markDone('lpnOrigen', v);
    go('subLpnOrigen');
  }

  function confirmSub() {
    var sub = requireValue('inputSubLpnOrigen', 'errSubLpn', 'la SubLPN origen');
    if (!sub) return;
    if (state.doneSubs.indexOf(sub) !== -1) {
      setErr('errSubLpn', 'Esa SubLPN ya fue acomodada en esta tarea.');
      return;
    }
    markDone('subLpnOrigen', sub);
    state.full = resolveFullSubFromBackend(sub);
    if (state.full) {
      go('locDestino');
      return;
    }
    go('producto');
  }

  function confirmProducto() {
    var v = requireValue('inputProducto', 'errProducto', 'el producto');
    if (!v) return;
    markDone('producto', v);
    go('cantidad');
  }

  function confirmCantidad() {
    setErr('errCantidad', '');
    var raw = val('inputCantidad');
    if (!raw) {
      setErr('errCantidad', 'Ingresa la cantidad.');
      return;
    }
    var qty = Number(raw);
    if (!qty || qty < 1) {
      setErr('errCantidad', 'Ingresa una cantidad válida.');
      return;
    }
    markDone('cantidad', String(qty));
    go('locDestino');
  }

  function confirmLocDest() {
    var loc = requireValue('inputLocDestino', 'errLocDestino', 'la localidad destino');
    if (!loc) return;
    markDone('locDestino', loc);
    go('lpnDestino');
  }

  function confirmLpnDest() {
    var lpn = requireValue('inputLpnDestino', 'errLpnDestino', 'la LPN destino');
    if (!lpn) return;
    markDone('lpnDestino', lpn);
    finishCycle();
  }

  function finishCycle() {
    var sub = state.done.subLpnOrigen;
    console.info('[Histórico]', {
      origen: {
        localidad: state.done.locOrigen,
        lpn: state.done.lpnOrigen,
        subLpn: sub,
        completa: state.full
      },
      producto: state.done.producto,
      cantidad: state.done.cantidad,
      destino: {
        localidad: state.done.locDestino,
        lpn: state.done.lpnDestino
      }
    });

    state.doneSubs.push(sub);
    var remaining = 2 - state.doneSubs.length;

    delete state.done.subLpnOrigen;
    delete state.done.producto;
    delete state.done.cantidad;
    delete state.done.locDestino;
    delete state.done.lpnDestino;
    state.full = false;

    $('inputSubLpnOrigen').value = '';
    $('inputProducto').value = '';
    $('inputCantidad').value = '';
    $('inputLocDestino').value = '';
    $('inputLpnDestino').value = '';

    if (remaining > 0) {
      showToast('Acomodo realizado. Queda ' + remaining + ' subLPN pendiente.', 'success');
      go('subLpnOrigen');
      return;
    }

    showToast('¡Listo! Acomodo completado', 'success');
    state.doneSubs = [];
    delete state.done.lpnOrigen;
    $('inputLpnOrigen').value = '';
    go('lpnOrigen');
  }

  function confirm() {
    ({
      locOrigen: confirmLoc,
      lpnOrigen: confirmLpn,
      subLpnOrigen: confirmSub,
      producto: confirmProducto,
      cantidad: confirmCantidad,
      locDestino: confirmLocDest,
      lpnDestino: confirmLpnDest
    })[state.step]();
  }

  function back() {
    var steps = visibleSteps();
    var idx = steps.indexOf(state.step);
    if (idx <= 0) return;

    var prev = steps[idx - 1];

    if (state.step === 'locDestino' && state.full) {
      delete state.done.locDestino;
      state.full = false;
      go('subLpnOrigen');
      return;
    }

    if (state.step === 'producto') {
      state.full = false;
      delete state.done.subLpnOrigen;
      go('subLpnOrigen');
      return;
    }

    delete state.done[prev];
    go(prev);
  }

  function reset() {
    state.step = 'locOrigen';
    state.done = {};
    state.doneSubs = [];
    state.full = false;
    ['inputLocOrigen', 'inputLpnOrigen', 'inputSubLpnOrigen', 'inputProducto',
      'inputCantidad', 'inputLocDestino', 'inputLpnDestino'].forEach(function (id) {
      $(id).value = '';
    });
    STEPS.forEach(hideStep);
    go('locOrigen');
    showToast('Tarea cancelada.', 'warn');
  }

  function bindEnter(id, fn) {
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fn(); }
    });
  }

  function init() {
    bindEnter('inputLocOrigen', confirmLoc);
    bindEnter('inputLpnOrigen', confirmLpn);
    bindEnter('inputSubLpnOrigen', confirmSub);
    bindEnter('inputProducto', confirmProducto);
    bindEnter('inputCantidad', confirmCantidad);
    bindEnter('inputLocDestino', confirmLocDest);
    bindEnter('inputLpnDestino', confirmLpnDest);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') back();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
