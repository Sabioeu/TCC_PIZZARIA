package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.PaymentCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface PaymentChargeRepository extends JpaRepository<PaymentCharge, Long> {
    List<PaymentCharge> findTop100ByBranchIdOrderByCreatedAtDesc(Long branchId);
    Optional<PaymentCharge> findByExternalReference(String externalReference);
}
