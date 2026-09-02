package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.AuditEvent;
import com.integrador.api.pizza.repository.AuditEventRepository;
import com.integrador.api.pizza.security.AppPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditEventRepository events;

    public void record(Long branchId, String action, String entityType, Object entityId, String details) {
        events.save(AuditEvent.builder().branchId(branchId).actor(actor()).action(action)
                .entityType(entityType).entityId(entityId == null ? null : entityId.toString()).details(details).build());
    }

    public List<AuditEvent> list(Long branchId) { return events.findTop200ByBranchIdOrderByCreatedAtDesc(branchId); }

    public String actor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppPrincipal principal) return principal.email();
        return "system@aurora.local";
    }
}
