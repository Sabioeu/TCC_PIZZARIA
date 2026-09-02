package com.integrador.api.pizza.web;

import com.integrador.api.pizza.security.AppPrincipal;
import com.integrador.api.pizza.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;

    @PostMapping("/auth/login")
    public AuthService.LoginResponse login(@RequestBody AuthService.LoginRequest request) { return auth.login(request); }

    @GetMapping("/auth/me")
    public AuthService.UserProfile me(@AuthenticationPrincipal AppPrincipal principal) { return auth.me(principal); }

    @GetMapping("/users")
    public List<AuthService.UserProfile> users(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return auth.users(branchId); }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthService.UserProfile user(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId,
                                        @RequestBody AuthService.CreateUser request) { return auth.create(branchId, request); }
}
