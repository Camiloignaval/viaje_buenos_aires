# 14 · Development Guidelines

## How Aurora Must Be Built

Version 1.0

---

# Introducción

Este documento define la forma en que Aurora debe desarrollarse.

No describe funcionalidades.

No describe pantallas.

Describe la filosofía de desarrollo.

Todo cambio realizado en el proyecto debe respetar estas reglas.

El objetivo es que Aurora pueda crecer durante muchos años sin perder calidad.

---

# Filosofía

Aurora no debe desarrollarse como un conjunto de páginas.

Aurora debe desarrollarse como un motor de experiencias.

El contenido cambia.

El motor permanece.

Nunca escribir código específico para un viaje.

Siempre escribir código reutilizable.

---

# Regla principal

Aurora nunca debe contener información fija.

Ejemplo incorrecto.

const city = "Buenos Aires"

Ejemplo correcto.

story.destination

Todo debe provenir del Story Package.

---

# Story First

La aplicación nunca decide qué mostrar.

El Story Package decide.

Aurora únicamente interpreta.

Aurora nunca conoce:

• Restaurantes

• Cafeterías

• Lugares

• Fotografías

• Presupuestos

• Actividades

Todo llega desde la historia.

---

# Component First

Toda pantalla debe dividirse en componentes pequeños.

Ejemplo.

Hero

↓

Timeline

↓

Activity Card

↓

Photo Gallery

↓

Memory Card

↓

Restaurant Card

↓

Coffee Card

↓

Map Card

↓

Day Footer

Nunca construir páginas gigantes.

---

# Reutilización

Si un componente puede reutilizarse.

Debe reutilizarse.

Nunca duplicar lógica.

Nunca copiar componentes.

Nunca copiar estilos.

---

# Mobile First

Aurora está diseñada para móvil.

Desktop es una adaptación.

Nunca al revés.

---

# Progressive Web App

Aurora es una PWA.

Debe sentirse como una aplicación nativa.

Debe poder instalarse.

Debe funcionar offline.

Debe abrirse en pantalla completa.

Nunca depender del navegador para ofrecer una buena experiencia.

---

# Offline First

Toda acción debe funcionar sin internet.

Crear nota.

Agregar fotografía.

Marcar checklist.

Favoritos.

Todo.

La sincronización ocurre después.

Nunca bloquear al usuario.

---

# Performance

Aurora debe sentirse inmediata.

Objetivos.

Primera carga menor a 2 segundos.

Cambios de capítulo instantáneos.

Animaciones fluidas.

Scroll a 60 FPS.

Nunca sacrificar fluidez por efectos visuales.

---

# Imágenes

Nunca cargar imágenes gigantes.

Siempre generar versiones optimizadas.

Hero.

Medium.

Thumbnail.

Lazy Loading obligatorio.

---

# Videos

Nunca reproducir automáticamente.

Siempre utilizar poster.

Carga diferida.

---

# Estado

Todo estado debe ser predecible.

No utilizar estados ocultos.

Todo cambio debe poder explicarse mediante la máquina de estados.

---

# Sincronización

Aurora debe asumir que internet puede desaparecer en cualquier momento.

Toda información debe guardarse primero localmente.

Luego sincronizar.

Nunca al revés.

---

# Arquitectura

Aurora debe dividirse en cuatro capas.

Presentation

↓

Application

↓

Domain

↓

Infrastructure

Nunca mezclar responsabilidades.

---

# UI

Los componentes nunca deben contener lógica de negocio.

Solo presentación.

Toda regla pertenece al dominio.

---

# Story Engine

Existe un único responsable de interpretar la historia.

Story Engine.

Ningún componente debe leer directamente el JSON.

Todos consultan al Story Engine.

---

# Diseño

El diseño siempre responde al contenido.

Nunca al contrario.

Si un contenido necesita una nueva vista.

Crear un componente.

No modificar la historia.

---

# IA

La inteligencia artificial nunca forma parte del motor principal.

La IA únicamente genera historias.

Una vez creada la historia.

Aurora funciona completamente sin IA.

---

# Testing

Cada componente debe poder probarse de forma aislada.

Cada capítulo debe poder ejecutarse independientemente.

Cada historia debe funcionar sin modificar código.

---

# Escalabilidad

Agregar un nuevo viaje nunca debe requerir programación.

Solo un nuevo Story Package.

Si agregar una historia implica escribir código.

La arquitectura es incorrecta.

---

# Código

Priorizar siempre.

Legibilidad.

Simplicidad.

Reutilización.

Antes que optimizaciones prematuras.

---

# Objetivo final

Aurora no debe convertirse en una aplicación difícil de mantener.

Debe convertirse en una plataforma capaz de conservar historias durante muchos años.

Cada línea de código debe acercarnos a ese objetivo.

---

# Última regla

Cuando exista una duda entre implementar algo rápido o implementarlo correctamente.

Elegir siempre la segunda opción.

Aurora fue diseñada para durar.

No para terminarse rápido.
