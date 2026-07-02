"""Entry point for Aya Bar v2."""

from app.config import AppConfig
from app.services.settings_service import SettingsService
from app.services.status_service import StatusService
from app.views.main_window import MainWindow


def main() -> None:
    config = AppConfig()
    status_service = StatusService(
        status_file=config.status_file,
        history_file=config.history_file,
    )
    settings_service = SettingsService(settings_file=config.settings_file)
    MainWindow(
        config=config,
        status_service=status_service,
        settings_service=settings_service,
    ).run()


if __name__ == "__main__":
    main()
