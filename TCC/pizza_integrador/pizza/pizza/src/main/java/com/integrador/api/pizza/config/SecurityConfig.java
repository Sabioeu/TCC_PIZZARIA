package com.integrador.api.pizza.config;

import com.integrador.api.pizza.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/health", "/api/public/**", "/ws/**",
                                "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/h2-console/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products", "/api/orders", "/api/tables").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/branches").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/products/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers("/api/customers/**", "/api/loyalty/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "WAITER")
                        .requestMatchers("/api/settings/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers("/api/users/**", "/api/audit/**").hasRole("ADMIN")
                        .requestMatchers("/api/cash/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER")
                        .requestMatchers("/api/commerce/backup", "/api/commerce/fiscal/**", "/api/commerce/messages/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers("/api/commerce/**").hasAnyRole("ADMIN", "MANAGER", "CASHIER")
                        .requestMatchers("/api/finance/**", "/api/purchases/**", "/api/suppliers/**", "/api/reports/**")
                        .hasAnyRole("ADMIN", "MANAGER")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    UserDetailsService userDetailsService(com.integrador.api.pizza.repository.AppUserRepository users) {
        return email -> users.findByEmailIgnoreCase(email).map(value -> User.withUsername(value.getEmail())
                .password(value.getPasswordHash()).roles(value.getRole().name()).disabled(!value.isActive()).build())
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("Usuario nao encontrado"));
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Location"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
