package com.integrador.api.pizza;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.integrador.api.pizza.domain.DiningTable;
import com.integrador.api.pizza.domain.InventoryItem;
import com.integrador.api.pizza.repository.DiningTableRepository;
import com.integrador.api.pizza.repository.InventoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PizzaApplicationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired InventoryRepository inventory;
    @Autowired DiningTableRepository tables;

    @Test void contextLoads() { }

    @Test void protectsBusinessEndpointsAndAuthenticatesWithJwt() throws Exception {
        mvc.perform(get("/api/dashboard")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@aurora.pizza\",\"password\":\"Aurora@2026\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test void dashboardBootstrapAndCatalogAreAvailable() throws Exception {
        String token = token("admin@aurora.pizza");
        mvc.perform(get("/api/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revenueToday").exists());
        mvc.perform(get("/api/bootstrap").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.products[0].name").exists())
                .andExpect(jsonPath("$.intelligence.cmvPercent").exists());
    }

    @Test void allowsCorsPreflightFromLocalFrontend() throws Exception {
        mvc.perform(options("/api/products").header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test void createsCustomizedOrderAndCalculatesServerSideTotal() throws Exception {
        String payload = """
                {"type":"PICKUP","customerName":"Teste Integrado","couponCode":"AURORA10",
                 "items":[{"productId":1,"quantity":2,"variantName":"Grande","modifiers":["Extra mozzarella"]}],
                 "payments":[{"method":"PIX","amount":120.00}]}
                """;
        mvc.perform(post("/api/orders").header(HttpHeaders.AUTHORIZATION, bearer(token("admin@aurora.pizza")))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("RECEIVED"))
                .andExpect(jsonPath("$.discount").value(12.58)).andExpect(jsonPath("$.total").value(113.22));
    }

    @Test void deductsRecipeStockWhenKitchenStartsPreparation() throws Exception {
        String token = token("admin@aurora.pizza");
        InventoryItem flour = inventory.findAllByBranchIdOrderByNameAsc(1L).stream().filter(item -> item.getName().startsWith("Farinha")).findFirst().orElseThrow();
        BigDecimal before = flour.getQuantity();
        MvcResult created = mvc.perform(post("/api/orders").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"PICKUP\",\"items\":[{\"productId\":1,\"quantity\":1,\"variantName\":\"Grande\",\"modifiers\":[]}]}"))
                .andExpect(status().isCreated()).andReturn();
        long orderId = mapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(patch("/api/orders/{id}/status", orderId).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PREPARING\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stockDeducted").value(true));
        assertThat(inventory.findById(flour.getId()).orElseThrow().getQuantity()).isEqualByComparingTo(before.subtract(new BigDecimal("0.2800")));
    }

    @Test void enforcesBranchIsolationForNonAdminUsers() throws Exception {
        mvc.perform(get("/api/products").header(HttpHeaders.AUTHORIZATION, bearer(token("gerente@aurora.pizza"))).header("X-Branch-Id", "2"))
                .andExpect(status().isForbidden());
    }

    @Test void acceptsTableOrderThroughPublicQrCode() throws Exception {
        DiningTable table = tables.findAllByBranchIdOrderByNumberAsc(1L).stream().filter(value -> value.getQrToken() != null).findFirst().orElseThrow();
        mvc.perform(post("/api/public/menu/{token}/orders", table.getQrToken()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Cliente QR\",\"items\":[{\"productId\":1,\"quantity\":1,\"variantName\":\"Grande\",\"modifiers\":[]}]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("DINE_IN"))
                .andExpect(jsonPath("$.tableNumber").value(table.getNumber()));
    }

    @Test void createsTraceablePixChargeAndProtectsCommerceEndpoints() throws Exception {
        mvc.perform(get("/api/commerce/charges")).andExpect(status().isForbidden());
        String token = token("admin@aurora.pizza");
        MvcResult order = mvc.perform(post("/api/orders").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"PICKUP\",\"items\":[{\"productId\":1,\"quantity\":1,\"variantName\":\"Grande\",\"modifiers\":[]}]}") )
                .andExpect(status().isCreated()).andReturn();
        long orderId = mapper.readTree(order.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/api/commerce/pix").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"orderId\":" + orderId + "}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.pixCopyPaste").isNotEmpty());
    }

    @Test void registersPersonalShiftAndProtectsTeamHistory() throws Exception {
        String token = token("caixa@aurora.pizza");
        MvcResult shift = mvc.perform(post("/api/workforce/clock-in").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"notes\":\"Turno de teste\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("OPEN")).andReturn();
        long shiftId = mapper.readTree(shift.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(get("/api/workforce/shifts").header(HttpHeaders.AUTHORIZATION, bearer(token))).andExpect(status().isForbidden());
        mvc.perform(post("/api/workforce/shifts/{id}/clock-out", shiftId).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test void acceptsOneVerifiedFeedbackPerCompletedOrder() throws Exception {
        String token = token("admin@aurora.pizza");
        MvcResult created = mvc.perform(post("/api/orders").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"PICKUP\",\"customerName\":\"Cliente Feedback\",\"items\":[{\"productId\":1,\"quantity\":1,\"variantName\":\"Grande\",\"modifiers\":[]}]}"))
                .andExpect(status().isCreated()).andReturn();
        JsonNode order = mapper.readTree(created.getResponse().getContentAsString());
        mvc.perform(patch("/api/orders/{id}/status", order.get("id").asLong()).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk());
        String feedback = mapper.writeValueAsString(new Feedback(order.get("code").asText(), 5, "Excelente"));
        mvc.perform(post("/api/public/feedback").contentType(MediaType.APPLICATION_JSON).content(feedback))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.rating").value(5));
        mvc.perform(post("/api/public/feedback").contentType(MediaType.APPLICATION_JSON).content(feedback))
                .andExpect(status().isBadRequest());
    }

    @Test void deliveryDriverClaimsAndCompletesOwnWorkflow() throws Exception {
        String admin = token("admin@aurora.pizza");
        MvcResult created = mvc.perform(post("/api/orders").header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"DELIVERY\",\"customerName\":\"Cliente Rota\",\"deliveryAddress\":\"Av Paulista, 1000\",\"items\":[{\"productId\":1,\"quantity\":1,\"variantName\":\"Grande\",\"modifiers\":[]}]}"))
                .andExpect(status().isCreated()).andReturn();
        long orderId = mapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(patch("/api/orders/{id}/status", orderId).header(HttpHeaders.AUTHORIZATION, bearer(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"READY\"}"))
                .andExpect(status().isOk());
        String driver = token("entregador@aurora.pizza");
        mvc.perform(patch("/api/orders/{id}/assign-self", orderId).header(HttpHeaders.AUTHORIZATION, bearer(driver)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.deliveryDriver").value("Carlos Souza"));
        mvc.perform(patch("/api/orders/{id}/status", orderId).header(HttpHeaders.AUTHORIZATION, bearer(driver)).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"OUT_FOR_DELIVERY\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/orders/{id}/status", orderId).header(HttpHeaders.AUTHORIZATION, bearer(driver)).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isOk());
    }

    @Test void privacyExportIsRestrictedToAdministrators() throws Exception {
        mvc.perform(get("/api/privacy/customers/1/export").header(HttpHeaders.AUTHORIZATION, bearer(token("caixa@aurora.pizza"))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/privacy/customers/1/export").header(HttpHeaders.AUTHORIZATION, bearer(token("admin@aurora.pizza"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.format").value("AURORA-LGPD-1"));
    }

    private String token(String email) throws Exception {
        MvcResult login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new Login(email, "Aurora@2026"))))
                .andExpect(status().isOk()).andReturn();
        JsonNode json = mapper.readTree(login.getResponse().getContentAsString());
        return json.get("token").asText();
    }
    private String bearer(String token) { return "Bearer " + token; }
    private record Login(String email, String password) { }
    private record Feedback(String orderCode, int rating, String comment) { }
}
