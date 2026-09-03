package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.CustomerFeedback;
import com.integrador.api.pizza.domain.SaleOrder;
import com.integrador.api.pizza.domain.StaffShift;
import com.integrador.api.pizza.repository.CustomerFeedbackRepository;
import com.integrador.api.pizza.repository.SaleOrderRepository;
import com.integrador.api.pizza.repository.StaffShiftRepository;
import com.integrador.api.pizza.security.AppPrincipal;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PeopleExperienceService {
    private final StaffShiftRepository shifts;
    private final CustomerFeedbackRepository feedback;
    private final SaleOrderRepository orders;
    private final AuditService audit;

    public List<StaffShift> shifts(Long branchId) { return shifts.findTop200ByBranchIdOrderByStartedAtDesc(branchId); }
    public StaffShift currentShift(Long branchId, Long userId) { return shifts.findFirstByBranchIdAndUserIdAndStatusOrderByStartedAtDesc(branchId, userId, StaffShift.Status.OPEN).orElse(null); }

    @Transactional
    public StaffShift clockIn(Long branchId, AppPrincipal principal, ShiftRequest request) {
        shifts.findFirstByBranchIdAndUserIdAndStatusOrderByStartedAtDesc(branchId, principal.id(), StaffShift.Status.OPEN)
                .ifPresent(value -> { throw new IllegalArgumentException("Já existe um turno aberto para este colaborador"); });
        StaffShift shift = shifts.save(StaffShift.builder().branchId(branchId).userId(principal.id()).employeeName(principal.name())
                .status(StaffShift.Status.OPEN).startedAt(LocalDateTime.now()).notes(clean(request == null ? null : request.notes(), 1000)).build());
        audit.record(branchId, "CLOCK_IN", "STAFF_SHIFT", shift.getId(), principal.name());
        return shift;
    }

    @Transactional
    public StaffShift clockOut(Long branchId, Long id, AppPrincipal principal, ShiftRequest request) {
        StaffShift shift = shifts.findById(id).filter(value -> value.getBranchId().equals(branchId))
                .orElseThrow(() -> new EntityNotFoundException("Turno não encontrado"));
        if (!shift.getUserId().equals(principal.id()) && !List.of("ADMIN", "MANAGER").contains(principal.role().name()))
            throw new IllegalArgumentException("Você não pode encerrar o turno de outro colaborador");
        if (shift.getStatus() == StaffShift.Status.CLOSED) throw new IllegalArgumentException("Turno já encerrado");
        shift.setStatus(StaffShift.Status.CLOSED); shift.setEndedAt(LocalDateTime.now());
        if (request != null && request.notes() != null) shift.setNotes(clean(request.notes(), 1000));
        audit.record(branchId, "CLOCK_OUT", "STAFF_SHIFT", shift.getId(), Duration.between(shift.getStartedAt(), shift.getEndedAt()).toMinutes() + " minutos");
        return shifts.save(shift);
    }

    @Transactional
    public CustomerFeedback submitFeedback(FeedbackRequest request) {
        if (request == null || request.orderCode() == null || request.orderCode().isBlank()) throw new IllegalArgumentException("Informe o código do pedido");
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) throw new IllegalArgumentException("A nota deve estar entre 1 e 5");
        SaleOrder order = orders.findByCodeIgnoreCase(request.orderCode().trim()).orElseThrow(() -> new EntityNotFoundException("Pedido não encontrado"));
        if (order.getStatus() != SaleOrder.Status.COMPLETED && order.getStatus() != SaleOrder.Status.DELIVERED)
            throw new IllegalArgumentException("A avaliação é liberada após a conclusão do pedido");
        if (feedback.findByOrderId(order.getId()).isPresent()) throw new IllegalArgumentException("Este pedido já foi avaliado");
        CustomerFeedback saved = feedback.save(CustomerFeedback.builder().branchId(order.getBranchId()).orderId(order.getId()).orderCode(order.getCode())
                .customerName(order.getCustomerName()).rating(request.rating()).comment(clean(request.comment(), 1500)).build());
        audit.record(order.getBranchId(), "CUSTOMER_FEEDBACK", "SALE_ORDER", order.getId(), "Nota " + request.rating());
        return saved;
    }

    public Map<String, Object> feedbackSummary(Long branchId) {
        List<CustomerFeedback> items = feedback.findTop200ByBranchIdOrderByCreatedAtDesc(branchId);
        BigDecimal average = items.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf(items.stream().mapToInt(CustomerFeedback::getRating).average().orElse(0)).setScale(1, RoundingMode.HALF_UP);
        Map<String, Object> result = new LinkedHashMap<>(); result.put("average", average); result.put("total", items.size()); result.put("items", items); return result;
    }

    private String clean(String value, int limit) { if (value == null) return null; String clean = value.trim(); return clean.length() > limit ? clean.substring(0, limit) : clean; }
    public record ShiftRequest(String notes) { }
    public record FeedbackRequest(String orderCode, Integer rating, String comment) { }
}
