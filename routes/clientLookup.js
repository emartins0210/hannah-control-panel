/**
 * ROUTE: CLIENT LOOKUP
 * Vapi chama este endpoint durante ligações inbound para
 * identificar o cliente pelo número de telefone.
 *
 * GET /api/lookup/:tenantId/:phone
 * Retorna dados do cliente se encontrado no banco de dados.
 */

const express  = require("express");
const router   = express.Router();
const leadDb   = require("../modules/leadDb");
const tenantDb = require("../modules/tenantDb");

router.get("/:tenantId/:phone", (req, res) => {
  const { tenantId, phone } = req.params;

  const tenant = tenantDb.getById(tenantId);
  if (!tenant) return res.status(404).json({ found: false });

  const latest  = leadDb.getByPhone(tenantId, phone);
  const history = leadDb.getHistoryByPhone(tenantId, phone);

  if (!latest) {
    return res.json({
      found: false,
      message: "New caller — no record found",
    });
  }

  // Monta histórico resumido
  const bookings = history.filter(l => l.status === "booked" || l.outcome === "booked");
  const lastBooking = bookings[0] || null;

  res.json({
    found: true,
    client: {
      name:        latest.name,
      phone:       latest.phone,
      email:       latest.email,
      address:     latest.address,
      serviceType: latest.serviceType,
      frequency:   latest.frequency,
      bedrooms:    latest.bedrooms,
      bathrooms:   latest.bathrooms,
      notes:       latest.notes,
    },
    lastBooking: lastBooking ? {
      service: lastBooking.serviceType,
      details: lastBooking.bookingDetails,
      date:    lastBooking.bookedAt,
    } : null,
    totalVisits:   bookings.length,
    isRecurring:   bookings.length > 1,
  });
});

module.exports = router;
