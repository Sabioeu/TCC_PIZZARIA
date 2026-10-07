package com.integrador.api.pizza.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI pizzaOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("API de Pizzaria")
                .description("API para gerenciamento de pizzaria")
                .version("1.0"));
    }
}
