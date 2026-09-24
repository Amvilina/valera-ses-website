(() => {
  const MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const GREEN = "#0A693C";
  const GOLD = "#B88923";

  const form = document.querySelector("#desk-form");
  const linesBox = document.querySelector("#desk-lines");
  const totalEl = document.querySelector("#desk-total");
  const addBtn = document.querySelector("#desk-add");
  const dateInput = form?.elements.date;
  const numberInput = form?.elements.number;
  if (!form || !linesBox || !dateInput) return;

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  dateInput.value = iso;
  if (numberInput && !numberInput.value) {
    numberInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }

  const money = (n) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n)} ₽`;
  const num = (v) => {
    const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const addLine = (data = {}) => {
    const row = document.createElement("div");
    row.className = "desk-line";
    row.innerHTML = `
      <label class="field">
        <span>Услуга</span>
        <input name="service" type="text" value="${data.service ?? ""}">
      </label>
      <label class="field">
        <span>Кратность</span>
        <input name="times" type="text" value="${data.times ?? ""}">
      </label>
      <label class="field">
        <span>Цена за м²</span>
        <input name="price" type="text" inputmode="decimal" value="${data.price ?? ""}">
      </label>
      <label class="field">
        <span>Площадь, м²</span>
        <input name="qty" type="text" inputmode="decimal" value="${data.qty ?? ""}">
      </label>
      <p class="desk-line-sum">0 ₽</p>
      <button class="btn btn-ghost desk-line-remove" type="button">Удалить</button>
    `;
    row.querySelector(".desk-line-remove").addEventListener("click", () => {
      if (linesBox.children.length === 1) return;
      row.remove();
      paintSums();
    });
    row.addEventListener("input", paintSums);
    linesBox.append(row);
    paintSums();
  };

  const readLines = () => [...linesBox.querySelectorAll(".desk-line")].map((row) => {
    const price = num(row.querySelector('[name="price"]').value);
    const qty = num(row.querySelector('[name="qty"]').value) || 1;
    return {
      service: row.querySelector('[name="service"]').value.trim(),
      times: row.querySelector('[name="times"]').value.trim(),
      price,
      qty,
      sum: Math.round(price * qty * 100) / 100,
    };
  }).filter((line) => line.service);

  const paintSums = () => {
    let total = 0;
    linesBox.querySelectorAll(".desk-line").forEach((row) => {
      const price = num(row.querySelector('[name="price"]').value);
      const qty = num(row.querySelector('[name="qty"]').value) || 1;
      const sum = Math.round(price * qty * 100) / 100;
      total += sum;
      row.querySelector(".desk-line-sum").textContent = money(sum);
    });
    totalEl.textContent = `Итого: ${money(total)}`;
  };

  const formatDate = (value) => {
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return `«${d.getDate()}» ${MONTHS[d.getMonth()]} ${d.getFullYear()} г.`;
  };

  const errorEl = document.querySelector("#desk-error");
  const showError = (text) => {
    if (!errorEl) return;
    errorEl.hidden = !text;
    errorEl.textContent = text || "";
  };

  addLine({ service: "Дератизация", times: "3 этапа, 1 раз в квартал", price: "105", unit: "м²", qty: "4000" });
  addLine({ service: "Дезинсекция", times: "3 этапа по графику", price: "65", unit: "м²", qty: "9700" });
  addLine({ service: "Акарицидная обработка", times: "1 раз, дата по согласованию", price: "72", unit: "м²", qty: "45000" });
  addBtn?.addEventListener("click", () => addLine());

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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");
    try {
      await loadScript("assets/js/vendor/pdfmake.min.js");
      await loadScript("assets/js/vendor/vfs_fonts.js");
      await loadScript("assets/js/desk-images.js");
    } catch (err) {
      showError("Не загрузился модуль PDF. Обновите страницу.");
      return;
    }
    const pdfMake = window.pdfMake;
    if (!pdfMake) {
      showError("Не загрузился модуль PDF. Обновите страницу.");
      return;
    }
    const images = window.DESK_IMAGES || {};
    const logo = images.logo;
    const stamp = images.stamp;
    const sign = images.sign;
    if (!logo || !stamp || !sign) {
      showError("Не загрузились печать или подпись. Обновите страницу.");
      return;
    }
    const data = new FormData(form);
    const lines = readLines();
    if (!lines.length) {
      showError("Добавьте хотя бы одну строку в таблицу.");
      return;
    }
    const total = lines.reduce((sum, line) => sum + line.sum, 0);

    const customerInn = String(data.get("customerInn") || "").trim();
    const customerKpp = String(data.get("customerKpp") || "").trim();
    const customerReqs = String(data.get("customerReqs") || "").trim();
    const valid = String(data.get("valid") || "2");
    const number = String(data.get("number") || "").trim();
    const guarantee = String(data.get("guarantee") || "").trim();
    const intro = String(data.get("intro") || "").trim();
    const note = String(data.get("note") || "").trim();
    const customerLines = [String(data.get("customer") || "")];
    if (customerInn) customerLines.push(`ИНН ${customerInn}`);
    if (customerKpp) customerLines.push(`КПП ${customerKpp}`);
    if (customerReqs) customerLines.push(customerReqs);

    const tableBody = [
      [
        { text: "Услуга", color: "#fff", bold: true },
        { text: "Кратность", color: "#fff", bold: true },
        { text: "Цена", color: "#fff", bold: true },
        { text: "Объём", color: "#fff", bold: true },
        { text: "Стоимость", color: "#fff", bold: true, alignment: "right" },
      ],
      ...lines.map((line) => [
        line.service,
        line.times || "—",
        `${money(line.price)}/м²`,
        `${new Intl.NumberFormat("ru-RU").format(line.qty)} м²`,
        { text: money(line.sum), alignment: "right" },
      ]),
      [
        { text: "Итоговая стоимость без НДС", colSpan: 4, bold: true, alignment: "right" },
        {}, {}, {},
        { text: money(total), bold: true, alignment: "right" },
      ],
    ];

    const doc = {
      pageSize: "A4",
      pageMargins: [40, 36, 40, 40],
      defaultStyle: { font: "Roboto", fontSize: 10, color: "#1a1a1a", lineHeight: 1.25 },
      content: [
        {
          columns: [
            { image: logo, width: 52 },
            { width: 16, text: "" },
            {
              width: "*",
              stack: [
                { text: "ИП Гуреев Валерий Вячеславович", fontSize: 10, color: "#333" },
                { text: "ИНН 500713992633", fontSize: 8, color: "#555" },
                { text: "ОГРНИП 326508810020101", fontSize: 8, color: "#555" },
              ],
            },
            {
              width: "auto",
              alignment: "right",
              stack: [
                { text: "+7 (495) 975-97-02", bold: true, fontSize: 12, color: GREEN },
                { text: "Москва, ул. Берёзовая аллея, 7Б", fontSize: 8, color: "#555" },
                { text: "Лицензия ЕРУЛ № 50.99.08.003.Л.000028.04.26", fontSize: 8, color: "#555" },
                { text: "гос-сэс.рф", fontSize: 8, color: "#555" },
              ],
            },
          ],
          margin: [0, 0, 0, 14],
        },
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: GOLD }] },
        {
          text: number ? `Коммерческое предложение № ${number}` : "Коммерческое предложение",
          alignment: "center",
          bold: true,
          fontSize: 16,
          color: GREEN,
          margin: [0, 14, 0, 4],
        },
        {
          table: {
            widths: ["*"],
            body: [[{
              text: String(data.get("subject") || ""),
              alignment: "center",
              bold: true,
              fontSize: 11,
              color: "#fff",
              fillColor: GOLD,
              margin: [4, 6, 4, 6],
            }]],
          },
          layout: "noBorders",
          margin: [0, 0, 0, 12],
        },
        intro && { text: intro, margin: [0, 0, 0, 10], fontSize: 9 },
        {
          table: {
            widths: ["*", "*"],
            body: [
              [
                { text: "Заказчик", bold: true, color: "#fff", fillColor: GREEN, fontSize: 9 },
                { text: "Объект работ", bold: true, color: "#fff", fillColor: GREEN, fontSize: 9 },
              ],
              [
                { text: customerLines.join("\n"), fontSize: 9 },
                { text: String(data.get("object")), fontSize: 9 },
              ],
            ],
          },
          layout: {
            hLineColor: () => "#d7d2c4",
            vLineColor: () => "#d7d2c4",
          },
          margin: [0, 0, 0, 12],
        },
        {
          table: {
            headerRows: 1,
            widths: ["*", 78, 78, 72, 78],
            body: tableBody,
          },
          layout: {
            fillColor: (row) => (row === 0 ? GREEN : null),
            hLineColor: () => "#d7d2c4",
            vLineColor: () => "#d7d2c4",
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 0, 0, 10],
        },
        guarantee && { text: guarantee, margin: [0, 0, 0, 6], bold: true, fontSize: 10 },
        note && { text: note, margin: [0, 0, 0, 8], fontSize: 8, color: "#444" },
        {
          text: `Настоящее коммерческое предложение составлено ${formatDate(data.get("date"))} и действует в течение ${valid} мес. с даты предоставления.`,
          fontSize: 9,
          margin: [0, 0, 0, 6],
        },
        {
          unbreakable: true,
          margin: [0, 10, 0, 0],
          stack: [
            { text: "ИП Гуреев В. В.", fontSize: 9, margin: [0, 0, 0, 2] },
            {
              alignment: "top",
              columnGap: 40,
              columns: [
                { image: sign, width: 96 , margin: [0, -43, 0, 0]},
                { width: "*", text: "" },
                { image: stamp, width: 300, margin: [0, -120, 0, 0] },
              ],
            },
          ],
        },
      ].filter(Boolean),
    };

    try {
      pdfMake.createPdf(doc).getBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, "_blank");
        if (!opened) {
          const link = document.createElement("a");
          link.href = url;
          link.download = `КП-${number || "ГОС-СЭС"}.pdf`;
          link.click();
        }
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось собрать PDF.");
    }
  });
})();
