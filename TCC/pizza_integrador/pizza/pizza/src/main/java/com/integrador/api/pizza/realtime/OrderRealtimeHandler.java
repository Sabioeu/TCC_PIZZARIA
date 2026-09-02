package com.integrador.api.pizza.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.integrador.api.pizza.domain.AppUser;
import com.integrador.api.pizza.security.AppPrincipal;
import com.integrador.api.pizza.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class OrderRealtimeHandler extends TextWebSocketHandler {
    private final ObjectMapper mapper;
    private final JwtService jwtService;
    private final Map<WebSocketSession, Long> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        try {
            Map<String, String> query = queryParameters(session);
            AppPrincipal principal = jwtService.parse(query.getOrDefault("token", ""));
            Long requestedBranch = parseBranch(query.get("branchId"), principal.branchId());
            Long authorizedBranch = principal.role() == AppUser.Role.ADMIN ? requestedBranch : principal.branchId();
            sessions.put(session, authorizedBranch);
            session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of(
                    "type", "CONNECTED", "branchId", authorizedBranch, "at", LocalDateTime.now().toString()))));
        } catch (Exception exception) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Sessao em tempo real invalida"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    public void publish(String type, Long branchId, Object payload) {
        try {
            String json = mapper.writeValueAsString(Map.of(
                    "type", type, "branchId", branchId, "payload", payload, "at", LocalDateTime.now().toString()));
            for (Map.Entry<WebSocketSession, Long> connection : sessions.entrySet()) {
                WebSocketSession session = connection.getKey();
                if (!branchId.equals(connection.getValue())) continue;
                if (!session.isOpen()) { sessions.remove(session); continue; }
                try { session.sendMessage(new TextMessage(json)); } catch (IOException ignored) { sessions.remove(session); }
            }
        } catch (Exception ignored) {
            // O pedido ja foi persistido; falha de notificacao nao pode desfazer a operacao.
        }
    }

    private Map<String, String> queryParameters(WebSocketSession session) {
        Map<String, String> result = new ConcurrentHashMap<>();
        String query = session.getUri() == null ? null : session.getUri().getRawQuery();
        if (query == null || query.isBlank()) return result;
        Arrays.stream(query.split("&"))
                .map(parameter -> parameter.split("=", 2))
                .filter(parts -> parts.length == 2)
                .forEach(parts -> result.put(
                        URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(parts[1], StandardCharsets.UTF_8)));
        return result;
    }

    private Long parseBranch(String value, Long fallback) {
        try {
            long branch = Long.parseLong(value);
            return branch > 0 ? branch : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
