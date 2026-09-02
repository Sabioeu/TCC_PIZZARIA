package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.RecipeComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RecipeRepository extends JpaRepository<RecipeComponent, Long> {
    List<RecipeComponent> findAllByProductId(Long productId);
    void deleteAllByProductId(Long productId);
}
