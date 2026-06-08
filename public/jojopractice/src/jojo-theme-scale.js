export const jojoScale = {
  name: "叫叫模块化视觉风格",
  unit: {
    designDensity: "Unity 2x",
    defaultPreviewScale: 0.5,
    thumbnailPreviewScale: 0.25
  },
  adaptation: {
    phone: { width: 1756, height: 810, contentScale: 1 },
    tablet: { width: 1440, height: 1080, contentScale: 0.72 },
    tabletAspectMax: 1.55,
    tabletMinSide: 760
  },
  themes: ["easy-yellow", "easy-blue", "challenge", "focus"],
  motion: {
    buttonPressScale: { className: "ani-btnpress-scal", scale: 1.5, duration: 600, spring: "Quick 300/20/1" },
    buttonPressDown: { className: "ani-btnpress-down", y: 10, duration: 600, spring: "Quick 300/20/1" },
    tipRepeat: { className: "ani-tip-repeat", keyframes: [{ y: -10, duration: 300 }, { y: 10, delay: 150, duration: 300 }] },
    sealDown: { className: "ani-seal-down", scale: [2, 1], opacity: [0, 1], duration: 600, spring: "Quick 300/20/1" },
    toastUp: { className: "ani-toast-up", y: [50, 0, -50], duration: 2800 },
    bounds: { className: "ani-bounds", keyframes: [{ y: 12 }, { y: -12 }, { y: 6 }, { y: -6 }], frameDuration: 300, interval: 1200 }
  }
};

export function classifyJojoViewport(input = {}) {
  const width = Math.max(1, input.width ?? window.innerWidth);
  const height = Math.max(1, input.height ?? window.innerHeight);
  const dpr = input.dpr ?? window.devicePixelRatio ?? 1;
  const aspect = width / height;
  const minSide = Math.min(width, height);
  const force = input.force;

  if (force && jojoScale.adaptation[force]) {
    return { ...jojoScale.adaptation[force], layout: force, aspect, dpr };
  }

  if (aspect <= jojoScale.adaptation.tabletAspectMax || minSide >= jojoScale.adaptation.tabletMinSide) {
    return { ...jojoScale.adaptation.tablet, layout: "tablet", aspect, dpr };
  }

  return { ...jojoScale.adaptation.phone, layout: "phone", aspect, dpr };
}

export function applyJojoAdaptation(root = document.documentElement, options = {}) {
  const target = root;

  function update() {
    const rect = target === document.documentElement
      ? { width: window.innerWidth, height: window.innerHeight }
      : target.getBoundingClientRect();
    const result = classifyJojoViewport({
      width: rect.width,
      height: rect.height,
      dpr: window.devicePixelRatio,
      force: options.force
    });
    const previewScale = Number(options.previewScale || jojoScale.unit.defaultPreviewScale);
    const rootWidth = result.width * previewScale;
    const rootHeight = result.height * previewScale;
    const contentScale = result.contentScale * previewScale;
    const scale = Math.min(1, rect.width / rootWidth, rect.height / rootHeight);

    target.style.setProperty("--jojo-root-width", rootWidth);
    target.style.setProperty("--jojo-root-height", rootHeight);
    target.style.setProperty("--jojo-stage-scale", scale.toFixed(5));
    target.style.setProperty("--jojo-content-scale", contentScale.toFixed(5));
    target.dataset.jojoLayout = result.layout;
    target.dataset.jojoPreviewScale = String(previewScale);
    target.dispatchEvent(new CustomEvent("jojo:adapt", {
      detail: {
        ...result,
        designRoot: [result.width, result.height],
        unityRoot: [result.width / 2, result.height / 2],
        previewRoot: [rootWidth, rootHeight],
        previewScale,
        renderedContentScale: contentScale
      }
    }));
  }

  update();
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("orientationchange", update, { passive: true });

  return {
    update,
    destroy() {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    }
  };
}

export function bindJojoThemeControls(root = document) {
  const buttons = root.querySelectorAll("[data-jojo-theme]");
  const target = document.documentElement;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.getAttribute("data-jojo-theme");
      target.dataset.theme = theme;
      buttons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
    });
  });
}

export function bindJojoForceLayout(root = document) {
  const select = root.querySelector("[data-jojo-force-layout]");
  const previewSelect = root.querySelector("[data-jojo-preview-scale]");

  function getOptions() {
    return {
      force: select?.value,
      previewScale: previewSelect?.value || jojoScale.unit.defaultPreviewScale
    };
  }

  let adapter = applyJojoAdaptation(document.documentElement, getOptions());

  function refresh() {
    adapter.destroy();
    adapter = applyJojoAdaptation(document.documentElement, getOptions());
  }

  select?.addEventListener("change", refresh);
  previewSelect?.addEventListener("change", refresh);

  return adapter;
}

export function bindJojoMotionDemo(root = document) {
  const submit = root.querySelector(".jojo-submit");
  const toast = root.querySelector("[data-jojo-toast]");
  const toastText = root.querySelector("[data-jojo-toast-text]");
  let toastTimer;

  function showToast(message = "这是一条成功提示") {
    if (!toast) return;

    if (toastText) {
      toastText.textContent = message;
    }

    window.clearTimeout(toastTimer);
    toast.classList.remove("is-showing");
    void toast.offsetWidth;
    toast.classList.add("is-showing");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-showing");
    }, 2800);
  }

  root.addEventListener("click", (event) => {
    const card = event.target.closest(".jojo-choice-option");

    if (card) {
      const group = card.closest("[data-choice-group]");
      group?.querySelectorAll(".selected").forEach((item) => item.classList.remove("selected"));
      card.classList.add("selected");

      if (submit) {
        submit.disabled = false;
      }

      return;
    }

    const toastTrigger = event.target.closest("[data-jojo-show-toast]");

    if (toastTrigger && !toastTrigger.disabled) {
      showToast();
    }
  });

  return { showToast };
}
