(() => {
  const fileInput = document.querySelector("#mark-file");
  const downloadBtn = document.querySelector("#mark-download");
  const stage = document.querySelector("#mark-stage");
  const nameEl = document.querySelector("#mark-name");
  const errorEl = document.querySelector("#mark-error");
  if (!fileInput || !downloadBtn || !stage) return;

  const SCALE = 1.45;
  const STAMP_SRC = "assets/img/docs/stamp.png";
  const SIGN_SRC = "assets/img/docs/sign.png";
  // Доли от ширины/высоты страницы. left/bottom — от левого и нижнего края.
  const DEFAULTS = {
    stamp: { width: 0.14, left: 0.42, bottom: 0.04 },
    sign: { width: 0.12, left: 0.08, bottom: 0.08 },
  };
  let pdfBytes = null;
  let fileName = "document.pdf";

  const showError = (text) => {
    if (!errorEl) return;
    errorEl.hidden = !text;
    errorEl.textContent = text || "";
  };

  const loadScript = (src) => new Promise((resolve, reject) => {
    const found = document.querySelector(`script[src="${src}"]`);
    if (found) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Не загрузился ${src}`));
    document.head.append(script);
  });

  const fetchBytes = async (src) => {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Не загрузились печать или подпись.");
    return res.arrayBuffer();
  };

  const pageFromPoint = (x, y) => [...stage.querySelectorAll(".mark-page")].find((page) => {
    const box = page.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  });

  const bindMove = (node, isResize) => {
    node.addEventListener("pointerdown", (event) => {
      if (isResize !== Boolean(event.target.closest(".mark-resize"))) return;
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      const start = {
        x: event.clientX,
        y: event.clientY,
        left: node.offsetLeft,
        top: node.offsetTop,
        width: node.offsetWidth,
      };
      const onMove = (move) => {
        if (isResize) {
          const width = Math.max(36, start.width + (move.clientX - start.x));
          node.style.width = `${width}px`;
          return;
        }
        let left = start.left + (move.clientX - start.x);
        let top = start.top + (move.clientY - start.y);
        const page = pageFromPoint(move.clientX, move.clientY);
        if (page && page !== node.parentElement) {
          const from = node.parentElement.getBoundingClientRect();
          const to = page.getBoundingClientRect();
          left += from.left - to.left;
          top += from.top - to.top;
          page.append(node);
          start.left = left;
          start.top = top;
          start.x = move.clientX;
          start.y = move.clientY;
        }
        node.style.left = `${left}px`;
        node.style.top = `${top}px`;
      };
      const onUp = () => {
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerup", onUp);
      };
      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerup", onUp);
    });
  };

  const makeMark = (kind, src) => {
    const item = document.createElement("div");
    item.className = `mark-item is-${kind}`;
    item.tabIndex = 0;
    item.innerHTML = `<img alt="" src="${src}"><i class="mark-resize"></i>`;
    bindMove(item, false);
    bindMove(item, true);
    return item;
  };

  const placeItem = (node, page, box) => {
    const width = page.clientWidth;
    const height = page.clientHeight;
    node.style.width = `${Math.round(width * box.width)}px`;
    page.append(node);
    requestAnimationFrame(() => {
      node.style.left = `${Math.round(width * box.left)}px`;
      node.style.top = `${Math.round(height - node.offsetHeight - height * box.bottom)}px`;
    });
  };

  const placeDefaults = (page, stamp, sign) => {
    placeItem(stamp, page, DEFAULTS.stamp);
    placeItem(sign, page, DEFAULTS.sign);
  };

  const renderPdf = async (bytes) => {
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/js/vendor/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    stage.replaceChildren();
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: SCALE });
      const wrap = document.createElement("div");
      wrap.className = "mark-page";
      wrap.dataset.page = String(i - 1);
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      wrap.append(canvas);
      stage.append(wrap);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    }
    const last = stage.querySelector(".mark-page:last-child");
    if (!last) throw new Error("В PDF нет страниц.");
    placeDefaults(last, makeMark("stamp", STAMP_SRC), makeMark("sign", SIGN_SRC));
  };

  const download = async () => {
    showError("");
    const PDFLib = window.PDFLib;
    if (!pdfBytes || !PDFLib) return;
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const stampPng = await pdfDoc.embedPng(await fetchBytes(STAMP_SRC));
    const signPng = await pdfDoc.embedPng(await fetchBytes(SIGN_SRC));
    stage.querySelectorAll(".mark-item").forEach((item) => {
      const wrap = item.parentElement;
      const canvas = wrap.querySelector("canvas");
      const page = pdfDoc.getPage(Number(wrap.dataset.page));
      const { width, height } = page.getSize();
      const sx = width / canvas.clientWidth;
      const sy = height / canvas.clientHeight;
      page.drawImage(item.classList.contains("is-stamp") ? stampPng : signPng, {
        x: item.offsetLeft * sx,
        y: height - (item.offsetTop + item.offsetHeight) * sy,
        width: item.offsetWidth * sx,
        height: item.offsetHeight * sy,
      });
    });
    const out = await pdfDoc.save();
    const blob = new Blob([out], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank");
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.replace(/\.pdf$/i, "") + "-signed.pdf";
      link.click();
    }
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    showError("");
    downloadBtn.disabled = true;
    try {
      await loadScript("assets/js/vendor/pdf.min.js");
      await loadScript("assets/js/vendor/pdf-lib.min.js");
      if (!window.pdfjsLib || !window.PDFLib) {
        throw new Error("Не загрузился модуль PDF.");
      }
      pdfBytes = new Uint8Array(await file.arrayBuffer());
      fileName = file.name || "document.pdf";
      await renderPdf(pdfBytes.slice());
      nameEl.hidden = false;
      nameEl.textContent = fileName;
      downloadBtn.disabled = false;
    } catch (err) {
      stage.replaceChildren();
      nameEl.hidden = true;
      showError(err instanceof Error ? err.message : "Не удалось открыть PDF.");
    }
  });

  downloadBtn.addEventListener("click", async () => {
    try {
      await download();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось сохранить PDF.");
    }
  });
})();
