# Базы данных и JDBC

## JDBC

`Connection`, `PreparedStatement`, `ResultSet`. Всегда закрывать в try-with-resources.

[мое повторить]: жизненный цикл Connection — кто создаёт пул, кто закрывает

[мое важно]: не забывать setAutoCommit(false) перед транзакцией

## JPA / Hibernate

Entity, `@Id`, `@GeneratedValue`. Lazy vs Eager fetching.

[мое вопрос]: что такое N+1 problem и как его лечить в Hibernate?

[мое повторить]: разница между persist(), merge() и save()

[мое ошибка]: забыл @Transactional на сервисе — данные не сохранялись

[мое идея]: написать мини-проект «заметки» на Spring Data JPA
