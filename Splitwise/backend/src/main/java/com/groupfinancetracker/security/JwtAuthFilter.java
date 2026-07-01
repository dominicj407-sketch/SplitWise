package com.groupfinancetracker.security;

import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            try {
                DecodedJWT jwt = jwtService.verify(token);
                Long uid = jwt.getClaim("uid").asLong();
                String email = jwt.getSubject();
                var authToken = new UsernamePasswordAuthenticationToken(email, null, java.util.List.of());
                authToken.setDetails(uid);
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } catch (Exception ignored) {
                
            }
        }
        filterChain.doFilter(request, response);
    }
}
