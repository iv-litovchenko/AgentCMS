window.ROADMAP_DATA = {
  "title": "Java — дорожная карта",
  "columns": [
    {
      "type": "single",
      "stage": {
        "id": "stage-1",
        "title": "Основы синтаксиса",
        "status": "done",
        "description": "Переменные, типы данных, операторы, циклы, условия, массивы. Контрольные точки: написать 10 программ «от переменной до цикла»."
      }
    },
    {
      "type": "single",
      "stage": {
        "id": "stage-2",
        "title": "Базы данных",
        "status": "progress",
        "description": "JDBC: Connection, PreparedStatement, ResultSet. Понимание транзакций и try-with-resources."
      }
    },
    {
      "type": "parallel",
      "stages": [
        {
          "id": "stage-3",
          "title": "Объектно-ориентированное программирование",
          "status": "progress",
          "description": "Классы, объекты, наследование, интерфейсы, полиморфизм. Паттерны: Singleton, Factory (базово)."
        },
        {
          "id": "stage-4",
          "title": "Многопоточность",
          "status": "todo",
          "description": "Thread, Runnable, synchronized, ExecutorService. Concurrent collections на уровне обзора."
        }
      ]
    },
    {
      "type": "single",
      "stage": {
        "id": "stage-4",
        "title": "Фреймворки",
        "status": "todo",
        "description": "Spring Boot: DI, REST-контроллеры, Spring Data JPA. Собрать CRUD-приложение с БД."
      }
    }
  ]
};
