package com.integrador.api.pizza;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PizzaApplicationTests {
    @Autowired MockMvc mvc;

    @Test void contextLoads() { }

    @Test void dashboardAndCatalogAreAvailable() throws Exception {
        mvc.perform(get("/api/dashboard")).andExpect(status().isOk()).andExpect(jsonPath("$.revenueToday").exists());
        mvc.perform(get("/api/products")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Margherita Suprema"));
    }

    @Test void createsAnOrderAndCalculatesItsTotal() throws Exception {
        String payload = """
                {"type":"PICKUP","customerName":"Teste Integrado","paymentMethod":"PIX","items":[{"productId":1,"quantity":2}]}
                """;
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("RECEIVED"))
                .andExpect(jsonPath("$.total").value(109.8));
    }
}
