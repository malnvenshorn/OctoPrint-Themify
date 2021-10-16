import octoprint.plugin

from .api import ThemifyAPI


class ThemifyPlugin(
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.TemplatePlugin,
    octoprint.plugin.SettingsPlugin,
    ThemifyAPI,
):

    # Assets

    def get_assets(self):
        return dict(
            js=["dist/themify.js"],
        )

    def get_template_configs(self):
        return [
            dict(type="settings", template="themify_settings.jinja2"),
        ]

    # Settings

    def get_settings_defaults(self):
        return dict(
            enable=False,
            theme=None,
        )

    # Static Server Routes

    def get_http_routes(self, server_routes):
        from octoprint.server.util.tornado import LargeResponseHandler
        # Returned routes will be registered relative to /plugin/themify
        return [(
            r"/static/themes/(.*)",
            LargeResponseHandler,
            dict(
                path=self.get_plugin_data_folder(),
            ),
        )]

    # Software Update

    def get_update_information(self):
        return {
            "themify": {
                "displayName": self._plugin_name,
                "displayVersion": self._plugin_version,

                # version check: github repository
                "type": "github_release",
                "user": "malnvenshorn",
                "repo": "octoprint-themify",
                "current": self._plugin_version,

                # update method: pip
                "pip": "https://github.com/malnvenshorn/octoprint-themify/archive/{target_version}.zip",
            },
        }


__plugin_name__ = "Themify"

__plugin_pythoncompat__ = ">=3.7"

__plugin_implementation__ = ThemifyPlugin()

__plugin_hooks__ = {
    "octoprint.server.http.routes": __plugin_implementation__.get_http_routes,
    "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
}
