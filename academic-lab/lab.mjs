import { createSearch } from "./search.mjs";

const byId = id => document.getElementById(id);
const number = new Intl.NumberFormat("en-GB");
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const decimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 });

function kpi(label, value) {
  const card = document.createElement("div");
  card.className = "kpi";
  const name = document.createElement("span");
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.textContent = value;
  card.append(name, amount);
  return card;
}

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}

async function retail() {
  const { raw, included, monthly } = await getJson("./retail.json");
  const market = byId("market");
  const measure = byId("measure");
  for (const name of [...new Set(monthly.map(row => row[1]))].sort()) {
    market.add(new Option(name, name));
  }
  function render() {
    const column = Number(measure.value);
    const totals = new Map();
    const metrics = [0, 0, 0];
    for (const row of monthly) {
      if (market.value && row[1] !== market.value) continue;
      totals.set(row[0], (totals.get(row[0]) ?? 0) + row[column]);
      metrics[0] += row[3];
      metrics[1] += row[4];
      metrics[2] += row[5];
    }
    const format = value => column === 5 ? money.format(value / 10000) : number.format(value);
    const max = Math.max(1, ...totals.values());
    const rows = [...totals].map(([month, value]) => {
      const row = document.createElement("tr");
      row.insertCell().textContent = month;
      const bar = document.createElement("meter");
      bar.max = 100;
      bar.value = 100 * value / max;
      bar.setAttribute("aria-label", month + " relative volume");
      row.insertCell().append(bar);
      row.insertCell().textContent = format(value);
      return row;
    });
    byId("sales").replaceChildren(...rows);
    byId("retail-kpis").replaceChildren(kpi("Gross sales", money.format(metrics[2] / 10000)),
      kpi("Invoices", number.format(metrics[0])), kpi("Units", number.format(metrics[1])));
    byId("retail-status").textContent = `${market.selectedOptions[0].text} · ${number.format(included)} eligible lines from ${number.format(raw)} source lines across all markets`;
  }
  market.addEventListener("change", render);
  measure.addEventListener("change", render);
  render();
}

async function retrieval() {
  const [corpus, evaluation] = await Promise.all([
    getJson("./http-corpus.json"), getJson("./retrieval-evaluation.json"),
  ]);
  const search = createSearch(corpus);
  function render() {
    const results = search(byId("query").value).map(({ row: [rfc, section, title, summary] }) => {
      const item = document.createElement("article");
      const heading = document.createElement("h3");
      const source = document.createElement("a");
      source.href = `https://www.rfc-editor.org/rfc/rfc${rfc}.html#section-${section}`;
      source.textContent = `${title} · RFC ${rfc} § ${section}`;
      heading.append(source);
      const description = document.createElement("p");
      description.textContent = summary;
      item.append(heading, description);
      return item;
    });
    byId("results").replaceChildren(...results);
    byId("search-status").textContent = results.length
      ? `${results.length} matches · top-three recall ${evaluation.at3}/${evaluation.questions} on development questions and ${evaluation.additional.at3}/${evaluation.additional.questions} on additional questions`
      : "No matching notes. Try a more specific HTTP term.";
  }
  byId("search-form").addEventListener("submit", event => {
    event.preventDefault();
    render();
  });
  for (const button of document.querySelectorAll("[data-query]")) {
    button.addEventListener("click", () => {
      byId("query").value = button.dataset.query;
      render();
    });
  }
  render();
}

async function benchmarks() {
  const list = await getJson("./benchmarks.json");
  const reports = await Promise.all(list.map(({ report }) => getJson(report)));
  const select = byId("benchmark-select");
  list.forEach(({ title }, index) => select.add(new Option(title, index)));
  if (select.dataset.index) select.selectedIndex = Number(select.dataset.index);
  function render() {
    const { title, summary, report, reference, reference_label: referenceLabel } = list[select.selectedIndex];
    const data = reports[select.selectedIndex];
    const item = document.createElement("article");
    const heading = document.createElement("h3");
    heading.textContent = title;
    const description = document.createElement("p");
    description.textContent = summary;
    const metrics = document.createElement("div");
    metrics.className = "kpis";
    const matrix = data.confusion_matrix ?? data.confusion_matrix_normal_then_attack;
    const labels = data.labels ?? ["Benign", "Attack"];
    if (data.attack_label_recall) {
      metrics.append(kpi("Attack F1", decimal.format(data.classification.attack["f1-score"])),
        kpi("PortScan recall", decimal.format(data.attack_label_recall.PortScan)),
        kpi("Test flows", number.format(data.test_rows)));
    } else if (data.visual) {
      metrics.append(kpi("Visual AUROC", decimal.format(data.visual.roc_auc)),
        kpi("Balanced accuracy", decimal.format(data.visual.balanced_accuracy)),
        kpi("Test clips with audio", number.format(data.test_clips_with_audio)));
    } else {
      metrics.append(kpi("SVM macro F1", decimal.format(data.classification["macro avg"]["f1-score"])),
        kpi("Extra Trees macro F1", decimal.format(data.extra_trees_comparison["macro avg"]["f1-score"])),
        kpi("Majority macro F1", decimal.format(data.majority_comparison["macro avg"]["f1-score"])));
    }
    item.append(heading, description, metrics);
    if (matrix) item.append(confusionTable(matrix, labels));
    if (data.held_out_thresholds) item.append(thresholdExplorer(data.held_out_thresholds));
    const link = document.createElement("a");
    link.href = report;
    link.textContent = "Open evaluation report";
    const links = document.createElement("div");
    links.className = "controls";
    links.append(link);
    if (reference) {
      const source = document.createElement("a");
      source.href = reference;
      source.textContent = referenceLabel;
      links.append(source);
    }
    item.append(links);
    byId("benchmarks").replaceChildren(item);
  }
  select.addEventListener("change", render);
  render();
}

function thresholdExplorer(thresholds) {
  const container = document.createElement("div");
  const label = document.createElement("label");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = 0;
  slider.max = thresholds.length - 1;
  slider.value = thresholds.findIndex(row => row.threshold === .5);
  const output = document.createElement("output");
  output.style.display = "block";
  const hint = document.createElement("p");
  hint.className = "method";
  hint.textContent = "Explore the trade-off on Friday's held-out flows. Choose a production threshold using separate validation data.";
  label.append(" Score threshold ", slider);
  function render() {
    const { threshold, fp, fn, tp } = thresholds[Number(slider.value)];
    const f1 = 2 * tp / Math.max(1, 2 * tp + fp + fn);
    output.textContent = `${threshold.toFixed(2)} · ${number.format(fp)} false alarms · ${number.format(fn)} missed attacks · attack F1 ${decimal.format(f1)}`;
  }
  slider.addEventListener("input", render);
  render();
  container.append(label, output, hint);
  return container;
}

function confusionTable(matrix, labels) {
  const table = document.createElement("table");
  table.createCaption().textContent = "Confusion matrix · rows are actual, columns are predicted";
  const heading = table.createTHead().insertRow();
  const th = (label, scope) => {
    const cell = document.createElement("th");
    cell.scope = scope;
    cell.textContent = label;
    return cell;
  };
  heading.append(th("Class", "col"), ...labels.map(label => th(label, "col")));
  const body = table.createTBody();
  matrix.forEach((values, index) => {
    const row = body.insertRow();
    row.append(th(labels[index], "row"));
    for (const value of values) row.insertCell().textContent = number.format(value);
  });
  return table;
}

for (const [init, status] of [[retail, "retail-status"], [retrieval, "search-status"], [benchmarks, "benchmarks"]]) {
  if (byId(status)) init().catch(() => { byId(status).textContent = "Data could not be loaded. Serve this folder over HTTP and reload."; });
}
