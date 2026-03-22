/**
 * CLEANAI FORM INTEGRATION
 * Cole este script no final do HTML do seu site no Manus AI
 * Ele intercepta o submit do formulário e envia para o servidor CleanAI
 *
 * COMO USAR NO MANUS AI:
 * 1. Abra o editor do site no Manus AI
 * 2. Vá em "Edit Code" ou "Custom Code" / "HTML"
 * 3. Cole este script antes do </body>
 * 4. Troque WEBHOOK_URL pela URL real do seu servidor
 */

(function () {
  // ─── CONFIGURAÇÃO ───────────────────────────────────────
  // Troque pela URL real após subir no Railway:
  const WEBHOOK_URL = "https://SEU-PROJETO.up.railway.app/api/webhook/WEBHOOK_KEY_DA_EMPRESA";
  // ────────────────────────────────────────────────────────

  // Dados coletados ao longo dos 6 passos do formulário
  const formData = {};

  // Mapa dos campos por passo (baseado no formulário do lopesservices.top)
  const stepFields = {
    1: "serviceType",   // "Residential Cleaning", "Airbnb / Vacation Rental", etc.
    2: "details",       // bedrooms, bathrooms, extras
    3: "frequency",     // one-time, weekly, bi-weekly, monthly
    4: "address",       // endereço completo
    5: "datetime",      // data e horário preferido
    6: "contact",       // nome, phone, email
  };

  // ── Captura seleção de serviço (Passo 1) ───────────────
  document.addEventListener("click", function (e) {
    // Cards de serviço no passo 1
    const serviceCard = e.target.closest("[data-service], .service-option, .service-card");
    if (serviceCard) {
      formData.serviceType =
        serviceCard.dataset.service ||
        serviceCard.querySelector("h3, h4, strong")?.textContent?.trim() ||
        serviceCard.textContent.trim().split("\n")[0].trim();
      console.log("[CleanAI] Service selected:", formData.serviceType);
    }
  });

  // ── Captura inputs em tempo real ───────────────────────
  document.addEventListener("input", function (e) {
    const el   = e.target;
    const name = el.name || el.id || el.getAttribute("data-field");
    if (!name) return;

    formData[name] = el.value;
  });

  document.addEventListener("change", function (e) {
    const el   = e.target;
    const name = el.name || el.id || el.getAttribute("data-field");
    if (!name) return;

    formData[name] = el.type === "checkbox" ? el.checked : el.value;
  });

  // ── Intercepta o submit final (último passo) ───────────
  document.addEventListener("submit", function (e) {
    const form = e.target;

    // Coleta todos os inputs do formulário atual
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach(function (input) {
      const key = input.name || input.id || input.getAttribute("data-field");
      if (key && input.value) {
        formData[key] = input.value;
      }
    });

    // Envia para CleanAI em background (não bloqueia o site)
    sendToCleanAI(formData);
  });

  // ── Também monitora o botão "Get Quote" / "Submit" ─────
  // (caso o formulário não use <form> tag — comum em Manus AI)
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("button, [type='submit'], .submit-btn, .btn-primary");
    if (!btn) return;

    const text = btn.textContent.toLowerCase();
    const isFinalStep =
      text.includes("submit") ||
      text.includes("get quote") ||
      text.includes("book") ||
      text.includes("schedule") ||
      text.includes("request") ||
      text.includes("send") ||
      text.includes("confirm");

    if (!isFinalStep) return;

    // Coleta todos os inputs visíveis na página
    document.querySelectorAll("input, select, textarea").forEach(function (input) {
      const key = input.name || input.id || input.getAttribute("placeholder") || input.getAttribute("data-field");
      if (key && input.value && input.value.trim()) {
        // Normaliza chaves comuns
        const normalized = normalizeKey(key, input.value);
        if (normalized) Object.assign(formData, normalized);
        else formData[key] = input.value.trim();
      }
    });

    if (hasMinimumData(formData)) {
      sendToCleanAI(formData);
    }
  });

  // ── Normaliza campos independente do nome no HTML ──────
  function normalizeKey(key, value) {
    key = key.toLowerCase();

    if (key.includes("name") && !key.includes("last")) return { name: value };
    if (key.includes("firstname") || key === "first") return { firstName: value };
    if (key.includes("lastname") || key === "last") return { lastName: value };
    if (key.includes("phone") || key.includes("tel") || key.includes("mobile")) return { phone: value };
    if (key.includes("email")) return { email: value };
    if (key.includes("address") || key.includes("street")) return { address: value };
    if (key.includes("bedroom") || key.includes("beds")) return { bedrooms: value };
    if (key.includes("bathroom") || key.includes("bath")) return { bathrooms: value };
    if (key.includes("frequency") || key.includes("how often")) return { frequency: value };
    if (key.includes("note") || key.includes("message") || key.includes("comment")) return { notes: value };
    if (key.includes("date")) return { preferredDate: value };
    if (key.includes("time")) return { preferredTime: value };
    if (key.includes("zip") || key.includes("postal")) return { zipCode: value };

    return null;
  }

  // ── Monta nome completo se separado ────────────────────
  function buildPayload(data) {
    const payload = Object.assign({}, data);

    if (!payload.name && (payload.firstName || payload.lastName)) {
      payload.name = [payload.firstName, payload.lastName].filter(Boolean).join(" ");
    }

    // Garante phone no formato correto
    if (payload.phone) {
      payload.phone = payload.phone.replace(/\D/g, "");
    }

    // Detect traffic source from UTM params and referrer
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource   = urlParams.get("utm_source")   || "";
    const utmMedium   = urlParams.get("utm_medium")   || "";
    const utmCampaign = urlParams.get("utm_campaign") || "";
    const utmContent  = urlParams.get("utm_content")  || "";
    const gclid       = urlParams.get("gclid")        || "";  // Google Ads click ID
    const fbclid      = urlParams.get("fbclid")       || "";  // Facebook click ID
    const referrer    = document.referrer || "";

    let source = "website_organic";
    if (fbclid || utmSource.includes("facebook") || utmSource.includes("fb") || utmSource.includes("instagram")) {
      source = "facebook_ads";
    } else if (gclid || utmSource.includes("google") || utmMedium.includes("cpc") || utmMedium.includes("ppc")) {
      source = "google_ads";
    } else if (utmSource.includes("email") || utmMedium.includes("email")) {
      source = "email_campaign";
    } else if (referrer.includes("google") || referrer.includes("bing") || referrer.includes("yahoo")) {
      source = "organic_search";
    } else if (utmSource) {
      source = utmSource;
    }

    payload.source    = source;
    payload.utmSource = utmSource;
    payload.utmMedium = utmMedium;
    payload.utmCampaign = utmCampaign;
    payload.utmContent  = utmContent;
    payload.submittedAt = new Date().toISOString();

    return payload;
  }

  // ── Valida se tem dados mínimos para ligar ─────────────
  function hasMinimumData(data) {
    const hasName  = data.name || data.firstName;
    const hasPhone = data.phone && data.phone.replace(/\D/g, "").length >= 10;
    return hasName && hasPhone;
  }

  // ── Envia para o servidor CleanAI ──────────────────────
  function sendToCleanAI(data) {
    if (!hasMinimumData(data)) {
      console.log("[CleanAI] Not enough data to send (need name + phone)");
      return;
    }

    const payload = buildPayload(data);
    console.log("[CleanAI] Sending lead to server:", payload);

    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,   // garante envio mesmo se página fechar
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        console.log("[CleanAI] Lead received successfully:", json.leadId);
      })
      .catch(function (err) {
        console.error("[CleanAI] Failed to send lead:", err);
      });
  }

  console.log("[CleanAI] Form integration loaded ✓");
})();
