"use strict";
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reduced.matches;
  const motionButton = $(".motion-button");
  function syncMotion() {
    document.body.classList.toggle("motion-paused", paused);
    motionButton.setAttribute("aria-pressed", String(paused));
    motionButton.innerHTML = paused ? '<span aria-hidden="true">▷</span> Resume motion' : '<span aria-hidden="true">Ⅱ</span> Pause motion';
  }
  syncMotion();
  motionButton.addEventListener("click", () => { paused = !paused; syncMotion(); });
  reduced.addEventListener("change", e => { paused = e.matches; syncMotion(); });
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("js-ready");
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); revealObserver.unobserve(entry.target); }
    }), { threshold: .08 });
    $$(".reveal").forEach(el => revealObserver.observe(el));
  }
  const menu = $(".menu-button"), nav = $("#navigation");
  function closeMenu() { menu.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); menu.setAttribute("aria-label", "Open navigation"); }
  menu.addEventListener("click", () => { const open = menu.getAttribute("aria-expanded") !== "true"; menu.setAttribute("aria-expanded", String(open)); menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation"); nav.classList.toggle("open", open); });
  $$("a", nav).forEach(a => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  let scrollPending = false;
  const progress = $(".scroll-progress");
  function updateScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    const sections = ["work", "experience", "about", "contact"];
    let active = "";
    sections.forEach(id => { if (document.getElementById(id).getBoundingClientRect().top < innerHeight * .45) active = id; });
    $$("a", nav).forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${active}`));
    scrollPending = false;
  }
  window.addEventListener("scroll", () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  updateScroll();
  $$(".filter").forEach(button => button.addEventListener("click", () => {
    $$(".filter").forEach(b => { b.classList.toggle("active", b === button); b.setAttribute("aria-pressed", String(b === button)); });
    let count = 0;
    $$(".projects > article").forEach(card => {
      const show = button.dataset.filter === "all" || card.dataset.category === button.dataset.filter;
      card.hidden = !show;
      if (show) { count++; card.classList.add("visible"); }
    });
    $(".work-count").textContent = `${String(count).padStart(2, "0")} SELECTED PROJECT${count === 1 ? "" : "S"}`;
  }));
  const experience = {
    furdo: { label: "CURRENT ROLE", date: "Aug 2026 — Present", role: "Software Developer Intern", location: "Furdo · Bangalore, India", intro: "Building the software behind everyday business operations.", bullets: ["Customize Odoo procurement and accounting workflows, including supplier selection, purchase reviews, GST, and advance payments.", "Validate business logic with automated workflow tests and check responsive ERP interfaces across screen sizes.", "Contribute quotation-data processing and calculation consistency checks to an interior estimation application."], tags: ["Odoo", "Python", "Business applications", "Testing"] },
    arga: { label: "INTERNSHIP", date: "Dec 2025 — Mar 2026", role: "IT Intern", location: "ARGA Investment Management · Chennai, India", intro: "Connecting financial calculations to dependable spreadsheet reporting.", bullets: ["Translated dividend discount model calculations into Excel formulas using C#/.NET while preserving cell references and financial logic.", "Automated financial report exports with Syncfusion XlsIO and ADO.NET.", "Connected backend data retrieval to formula-based Excel workbooks."], tags: ["C# / .NET", "ADO.NET", "Syncfusion XlsIO", "Excel"] },
    alesa: { label: "INTERNSHIP", date: "Jun 2024 — Nov 2024", role: "AI Intern", location: "ALESA AI Ltd · United Kingdom (Remote)", intro: "Bringing full-stack development and language models together.", bullets: ["Developed a vehicle management platform using MongoDB, Express, React, and Node.js.", "Implemented OTP authentication, user profiles, and vehicle service and insurance tracking.", "Integrated a Groq-powered language model for vehicle diagnostics and maintenance queries."], tags: ["MongoDB", "Express", "React", "Node.js", "Groq"] }
  };
  const experienceTabs = $$("[data-experience]");
  function selectExperience(button) {
    experienceTabs.forEach(b => { b.setAttribute("aria-selected", String(b === button)); b.tabIndex = b === button ? 0 : -1; });
    const data = experience[button.dataset.experience];
    const panel = $("#experience-panel");
    panel.setAttribute("aria-labelledby", button.id);
    panel.innerHTML = `<div class="experience-panel-meta"><span class="pill">${data.label}</span><span>${data.date}</span></div><h3>${data.role}</h3><p class="experience-location">${data.location}</p><p class="experience-intro">${data.intro}</p><ul>${data.bullets.map(b => `<li>${b}</li>`).join("")}</ul><div class="tags">${data.tags.map(t => `<span>${t}</span>`).join("")}</div>`;
    panel.classList.remove("refresh"); void panel.offsetWidth; panel.classList.add("refresh");
  }
  experienceTabs.forEach((button, index) => {
    button.addEventListener("click", () => selectExperience(button));
    button.addEventListener("keydown", e => {
      const keys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      let next = index;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = experienceTabs.length - 1;
      else next = (index + (["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : -1) + experienceTabs.length) % experienceTabs.length;
      experienceTabs[next].focus(); selectExperience(experienceTabs[next]);
    });
  });
  const projectData = {
    rag: {
      category: "ACADEMIC PROJECT / RETRIEVAL-AUGMENTED GENERATION",
      title: "Intelligent Document Query Assistant",
      intro: "A Python assistant that answers questions using passages retrieved from documents.",
      metrics: [["5,000+", "document chunks available for retrieval"]],
      challenge: "Find relevant passages in a large document collection and retain context across follow-up questions.",
      approach: ["Indexed document chunks with FAISS vector search and retrieved relevant passages with LangChain.", "Used prompt design and conversational memory to carry context across turns."],
      outcome: "The assistant retrieves supporting passages and uses them as context for responses.",
      tags: ["Python", "LangChain", "FAISS", "RAG"],
      note: "Academic project."
    },
    retail: {
      category: "ACADEMIC PROJECT / BUSINESS INTELLIGENCE",
      title: "Retail Sales Analytics Dashboard",
      intro: "A Power BI dashboard for exploring sales trends and revenue.",
      metrics: [["100,000+", "sales records analyzed"]],
      challenge: "Turn transaction records into consistent metrics that business users can explore.",
      approach: ["Cleaned and transformed sales data using SQL joins, aggregations, subqueries, and window functions.", "Built interactive Power BI reports and automated parts of the reporting workflow."],
      outcome: "The dashboard brings revenue, sales trends, and KPIs into a single reporting view.",
      tags: ["SQL", "Power BI", "KPI reporting", "Data visualization"],
      note: "Academic project."
    },

    cyber: { category: "ACADEMIC PROJECT / CYBERSECURITY", title: "Finding the threat inside the noise.", intro: "Cyber Threat Detection with WGAN Augmentation explores how synthetic training data and Transformer models can support network attack classification.", metrics: [["850,000+", "synthetic samples generated"]], challenge: "Network intrusion datasets require careful preprocessing and balanced representation of different attack patterns. The project examined data augmentation as part of a classification pipeline.", approach: ["Preprocessed CIC-IDS-2017 data with missing-value handling, scaling, and outlier treatment.", "Used a Wasserstein GAN to generate synthetic samples and expand training-data diversity.", "Trained a Transformer-based classifier with CUDA and automatic mixed precision."], outcome: "Evaluated a Transformer classifier across network attack categories.", tags: ["PyTorch", "WGAN", "Transformers", "CUDA", "CIC-IDS-2017"], note: "Academic work. The portfolio illustration is conceptual; it is not a live monitoring system." },
    deepfake: { category: "ACADEMIC PROJECT / MULTIMODAL AI", title: "More than meets the eye.", intro: "Multimodal Deepfake Detection combines video and audio representations to explore evidence of manipulated media.", metrics: [], challenge: "Manipulated video can contain subtle visual, facial-motion, and audio cues. The project explored these complementary signals rather than relying on one representation.", approach: ["Combined CNN and Vision Transformer representations with Wav2Vec2 audio features.", "Integrated facial tracking and lip-sync analysis in the processing pipeline.", "Used Grad-CAM for model explanations and FGSM adversarial tests to investigate robustness."], outcome: "Evaluated the multimodal pipeline on Celeb-DF-v2 and investigated its robustness to adversarial inputs.", tags: ["CNN", "ViT", "Wav2Vec2", "Grad-CAM", "FGSM"], note: "Academic work. The face mesh and waveform are conceptual illustrations, not a functioning detector." },
    bone: { category: "ACADEMIC PROJECT / COMPUTER VISION", title: "Patterns beneath the surface.", intro: "Bone Density Classification from X-rays applies transfer learning to an image-classification problem.", metrics: [["84.1%", "reported accuracy"], ["81.3%", "reported F1-score"]], challenge: "Image variability and class imbalance can make classification difficult. This project explored training and evaluation techniques that address both.", approach: ["Trained an EfficientNet-B3 classifier with image augmentation and class rebalancing.", "Applied test-time augmentation to the evaluation workflow.", "Used label smoothing and cosine annealing to refine training."], outcome: "The project reported 84.1% accuracy and an 81.3% F1-score. It is an academic image-classification study, not a clinically validated diagnostic product.", tags: ["EfficientNet-B3", "Transfer learning", "Computer vision", "Image classification"], note: "Academic work. The bone visual is a conceptual illustration, not patient imagery." },
    odoo: { category: "PROFESSIONAL WORK / FURDO", title: "Making business workflows flow.", intro: "Custom Odoo ERP development connects purchasing, accounting, and business interfaces to the way teams actually work.", metrics: [["18", "recorded advance-payment workflow tests"], ["10", "screen widths checked in local UI validation"]], challenge: "Procurement and accounting workflows need clear rules, consistent calculations, and interfaces that remain usable as records and screen sizes change.", approach: ["Customized supplier selection, purchase review workflows, GST reporting, and advance-payment calculations.", "Validated payment logic with automated workflow tests and local browser checks.", "Refined responsive ERP interfaces across widths from 320 to 3,840 pixels."], outcome: "The recorded local validation included 18 advance-payment workflow cases and interface checks at 10 screen widths. Local testing is distinguished from production rollout.", tags: ["Odoo 19", "Python", "ERP customization", "Workflow testing", "Responsive UI"], note: "Workplace contribution at Furdo. No proprietary source code, client records, or internal systems are published here." },
    finance: { category: "PROFESSIONAL WORK / ARGA INVESTMENT MANAGEMENT", title: "From financial logic to clarity.", intro: "Financial reporting work focused on carrying application calculations into usable, formula-based Excel reports.", metrics: [], challenge: "Exporting a financial model involves preserving its calculations and references, not merely copying visible values into a spreadsheet.", approach: ["Translated dividend discount model computations into Excel formulas using C#/.NET.", "Implemented formula mapping and cell-reference handling.", "Used Syncfusion XlsIO and ADO.NET to connect data retrieval with workbook exports."], outcome: "Built reporting workflows that connect backend data with financial calculation logic in Excel. No unverified time savings or business-impact percentages are claimed.", tags: ["C#", ".NET", "ADO.NET", "Syncfusion XlsIO", "Excel"], note: "Internship contribution at ARGA Investment Management. No proprietary model, source code, or financial data is published here." }
  };
  const dialog = $(".project-dialog"); let returnFocus = null;
  $$("[data-project]").forEach(button => button.addEventListener("click", () => {
    const p = projectData[button.dataset.project]; if (!p) return;
    returnFocus = button;
    $(".dialog-body", dialog).innerHTML = `<span class="eyebrow">${p.category}</span><h2 id="dialog-title">${p.title}</h2><p class="dialog-intro">${p.intro}</p>${p.metrics.length ? `<div class="dialog-metrics">${p.metrics.map(m => `<div><strong>${m[0]}</strong><span>${m[1]}</span></div>`).join("")}</div>` : ""}<h3>The challenge</h3><p>${p.challenge}</p><h3>The approach</h3><ul>${p.approach.map(a => `<li>${a}</li>`).join("")}</ul><h3>The result</h3><p>${p.outcome}</p><div class="tags">${p.tags.map(t => `<span>${t}</span>`).join("")}</div><p class="dialog-note">${p.note}</p><a class="text-link" href="mailto:harisudan.rajendran2003@gmail.com">Ask me about this work <span aria-hidden="true">↗</span></a>`;
    dialog.showModal(); dialog.scrollTop = 0;
  }));
  $(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener("close", () => { if (returnFocus) returnFocus.focus({ preventScroll: true }); });
  $(".copy-email").addEventListener("click", async () => {
    const status = $(".copy-status");
    try { await navigator.clipboard.writeText("harisudan.rajendran2003@gmail.com"); status.textContent = "Email copied."; }
    catch { status.textContent = "harisudan.rajendran2003@gmail.com"; }
    window.setTimeout(() => { status.textContent = ""; }, 6000);
  });
  const canvas = $("#network"), ctx = canvas.getContext("2d");
  if (ctx) {
    let w = 0, h = 0, visible = true, frame = 0;
    function resize() { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); frame = 0; }
    new ResizeObserver(resize).observe(canvas); resize();
    if ("IntersectionObserver" in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(canvas);
    function draw(time) {
      requestAnimationFrame(draw);
      if (!visible || document.hidden || (paused && frame > 0)) return;
      frame++;
      ctx.clearRect(0, 0, w, h);
      const t = paused ? 0 : time * .00012, radius = Math.min(w, h) * .36;
      const points = Array.from({ length: 16 }, (_, i) => { const angle = i * Math.PI * 2 / 16 + t * (i % 2 ? 1 : -.65); const r = radius * (.77 + (i % 3) * .15); return { x: w / 2 + Math.cos(angle) * r * 1.1, y: h / 2 + Math.sin(angle) * r }; });
      points.forEach((p, i) => {
        [1, 4, 7].forEach(offset => { const q = points[(i + offset) % points.length]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = `rgba(181,239,118,${offset === 1 ? .34 : .11})`; ctx.lineWidth = .8; ctx.stroke(); });
        ctx.beginPath(); ctx.arc(p.x, p.y, i % 4 === 0 ? 4.2 : 2.2, 0, Math.PI * 2); ctx.fillStyle = i % 4 === 0 ? "#b5ef76" : "#6d9a68"; ctx.fill();
        if (i % 4 === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.strokeStyle = "#b5ef7645"; ctx.stroke(); }
      });
    }
    requestAnimationFrame(draw);
  }
})();

