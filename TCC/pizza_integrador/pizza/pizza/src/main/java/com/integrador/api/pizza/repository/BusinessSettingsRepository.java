package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.BusinessSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface BusinessSettingsRepository extends JpaRepository<BusinessSettings, Long> { Optional<BusinessSettings> findByBranchId(Long branchId); }
