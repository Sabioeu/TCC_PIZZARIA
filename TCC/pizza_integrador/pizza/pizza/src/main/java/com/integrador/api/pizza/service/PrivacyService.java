package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.Customer;
import com.integrador.api.pizza.domain.CustomerMessage;
import com.integrador.api.pizza.domain.SaleOrder;
import com.integrador.api.pizza.repository.CustomerMessageRepository;
import com.integrador.api.pizza.repository.CustomerRepository;
import com.integrador.api.pizza.repository.LoyaltyTransactionRepository;
import com.integrador.api.pizza.repository.SaleOrderRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PrivacyService {
    private final CustomerRepository customers;
    private final SaleOrderRepository orders;
    private final CustomerMessageRepository messages;
    private final LoyaltyTransactionRepository loyalty;
    private final AuditService audit;

    public Map<String,Object> export(Long branchId, Long customerId) {
        Customer customer = customer(branchId, customerId);
        Map<String,Object> result = new LinkedHashMap<>(); result.put("generatedAt", LocalDateTime.now()); result.put("format", "AURORA-LGPD-1");
        result.put("customer", customer); result.put("orders", orders.findAllByBranchIdAndCustomerIdOrderByCreatedAtDesc(branchId, customerId));
        result.put("messages", messages.findAllByBranchIdAndCustomerId(branchId, customerId)); result.put("loyalty", loyalty.findAllByBranchIdAndCustomerIdOrderByCreatedAtDesc(branchId, customerId));
        audit.record(branchId, "LGPD_EXPORT", "CUSTOMER", customerId, "Exportação de dados pessoais"); return result;
    }

    @Transactional
    public Map<String,String> anonymize(Long branchId, Long customerId) {
        Customer customer = customer(branchId, customerId); String anonymous = "Cliente anonimizado #" + customerId;
        customer.setName(anonymous); customer.setPhone(null); customer.setEmail(null); customer.setAddress(null); customer.setBirthday(null); customer.setMarketingOptIn(false); customers.save(customer);
        List<SaleOrder> customerOrders = orders.findAllByBranchIdAndCustomerIdOrderByCreatedAtDesc(branchId, customerId);
        customerOrders.forEach(order -> { order.setCustomerName(anonymous); order.setCustomerPhone(null); order.setDeliveryAddress(null); }); orders.saveAll(customerOrders);
        List<CustomerMessage> customerMessages = messages.findAllByBranchIdAndCustomerId(branchId, customerId);
        customerMessages.forEach(message -> { message.setRecipient("ANONYMIZED"); message.setBody("Conteúdo removido por solicitação LGPD"); }); messages.saveAll(customerMessages);
        audit.record(branchId, "LGPD_ANONYMIZE", "CUSTOMER", customerId, "Dados pessoais anonimizados mantendo registros financeiros");
        return Map.of("status", "ANONYMIZED", "customerId", customerId.toString());
    }

    private Customer customer(Long branchId, Long customerId) { return customers.findById(customerId).filter(value -> value.getBranchId().equals(branchId)).orElseThrow(() -> new EntityNotFoundException("Cliente não encontrado")); }
}
