package com.integrador.api.pizza.config;

import com.integrador.api.pizza.repository.UsuarioRepository;
import com.integrador.api.pizza.security.UsuarioAutenticado;
import com.integrador.api.pizza.security.SessaoAtualizadaFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.cors.*;
import java.util.*;

@Configuration
public class SecurityConfig {
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean public UserDetailsService userDetailsService(UsuarioRepository repo) {
        return email -> new UsuarioAutenticado(repo.findByEmailIgnoreCase(email.trim()).orElseThrow(()->new UsernameNotFoundException("Credenciais inválidas.")));
    }
    @Bean public SecurityFilterChain securityFilterChain(HttpSecurity http, UsuarioRepository repo, ObjectMapper json) throws Exception {
        http.cors(cors->cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf->{ /* Token de sessão exposto via /auth/csrf; proteção padrão permanece ativa. */ })
            .requestCache(cache->cache.disable())
            .authorizeHttpRequests(auth->auth
                .requestMatchers("/api/auth/csrf","/api/auth/config","/api/auth/login","/api/auth/registro","/error").permitAll()
                .requestMatchers("/api/usuarios/**","/swagger-ui/**","/swagger-ui.html","/v3/api-docs/**").hasRole("ADMINISTRADOR")
                .requestMatchers("/api/transacoes/**","/api/contas/**","/api/relatorios/**","/api/dashboard/**","/api/movimentos-estoque/**").hasAnyRole("ADMINISTRADOR","GERENTE")
                .requestMatchers(HttpMethod.GET,"/api/**").authenticated()
                .requestMatchers("/api/produtos/**","/api/insumos/**","/api/fornecedores/**","/api/mesas/**").hasAnyRole("ADMINISTRADOR","GERENTE")
                .requestMatchers(HttpMethod.DELETE,"/api/**").hasAnyRole("ADMINISTRADOR","GERENTE")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .formLogin(login->login.loginProcessingUrl("/api/auth/login").usernameParameter("email")
                .successHandler((request,response,auth)->{ response.setContentType("application/json;charset=UTF-8"); json.writeValue(response.getOutputStream(),Map.of("message","Login realizado.")); })
                .failureHandler((request,response,error)->{ response.setStatus(401); response.setContentType("application/json;charset=UTF-8"); json.writeValue(response.getOutputStream(),Map.of("message","E-mail ou senha incorretos.")); }))
            .logout(logout->logout.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request,response,auth)->response.setStatus(204)))
            .exceptionHandling(errors->errors
                .authenticationEntryPoint((request,response,error)->{ response.setStatus(401); response.setContentType("application/json;charset=UTF-8"); json.writeValue(response.getOutputStream(),Map.of("message","Entre no sistema para continuar.")); })
                .accessDeniedHandler((request,response,error)->{ response.setStatus(403); response.setContentType("application/json;charset=UTF-8"); json.writeValue(response.getOutputStream(),Map.of("message","Acesso não permitido ou sessão de segurança expirada. Atualize a página.")); }))
            .addFilterBefore(new SessaoAtualizadaFilter(repo),AuthorizationFilter.class);
        return http.build();
    }
    @Value("${pizza.cors.origins:http://localhost:3000,http://127.0.0.1:3000}") private String origins;
    @Bean public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c=new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s->!s.isEmpty()).toList());
        c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type","X-CSRF-TOKEN","X-XSRF-TOKEN","Accept"));
        c.setExposedHeaders(List.of("Content-Disposition")); c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",c); return source;
    }
}
