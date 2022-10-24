=================
RLI Metadata Tool
=================

**Generate and validate metadata strings following the Open Energy Metadata standard**

.. list-table::
   :widths: auto

   * - License
     - |badge_license|
   * - Documentation
     - 
   * - Publication
     - 
   * - Development
     - |badge_issue_open| |badge_issue_closes| |badge_pr_open| |badge_pr_closes|
   * - Community
     - |badge_contributing| |badge_contributors| |badge_repo_counts|

.. contents::
    :depth: 2
    :local:
    :backlinks: top

Introduction
============
| A web application to create and validate metadata strings following the **Open Energy Metadata** (OEMetadata). 
| The latest metadata version is `OEMetadata v1.5.1 <https://github.com/OpenEnergyPlatform/oemetadata>`_
| The running instance can be accessed on: https://meta.rl-institut.de/meta_creator/


Documentation
=============
**Getting started**

#. Cloning the repository
     * Copy URL of the project from Clone with HTTPS.
     * Change the current working directory to   the desired location.
     * Run ``git clone <URL>`` in command prompt. (GitBash can be used as well)
#. Creating virtual environment
     * Make sure `Python <https://www.python.org/>`_ is installed.
     * Ensure you can run Python from command prompt.
         * On Windows: Run ``py --version``. 
         * On Unix/MacOS: Run ``python3 --version``. 
     * Create the virtual environment by running this code in the command prompt.
         * On Windows: Run ``py -m venv <name-of-virtual-environment>``.
         * On Unix/MacOS: Run ``python3 -m venv <name-of-virtual-environment>``.
     |  (for more details visit https://docs.python.org/3/library/venv.html)
     * Activate virtual environment.
         * On Windows: Run ``env\Scripts\activate.bat``. 
         * On Unix/MacOS: Run ``source env/bin/activate``.
     |  env is the selected name for the virtual environment.
     |  Note that activating the virtual environment change the shell's prompt and show what virtual
     |  environment is being used.
#. Managing Packages with pip
     * Ensure you can run pip from command prompt.
         * On Windows: Run ``py -m pip --version``.
         * On Unix/MacOS: Run ``python3 -m pip --version``.
     * Go to meta_tool directory. (``cd meta_tool``)
     * Install a list of requirements specified in a *Requirements.txt*.
         * On Windows: Run ``py -m pip install -r requirements.txt``.
         * On Unix/MacOS: Run ``python3 -m pip install -r requirements.txt``.       
     (for more details visit https://packaging.python.org/en/latest/tutorials/installing-packages/)


**Running the project**

* Open the project in an editor. (e.g. VS code)
* Run the project in the editor. (Project runs on the virtual environment and activating the virtual environment will change shell’s prompt to show what virtual environment is being used)
* Go down to **meta_tool** directory in command line or terminal. (``cd meta_tool``)
* To run the project use subcommand **runserver**.
    * On Windows: Run ``py manage.py runserver``.
    * On Unix/MacOS: Run ``python3 manage.py runserver``.
* To see the output on the browser follow the link shown in the terminal. (e.g. http://127.0.0.1:8000/)

More information about this project: https://github.com/rl-institut/meta_tool


**Tip for developers**

If the page does not refresh correctly, clear the browser cache. You can force Chrome to pull in new data and ignore the saved ("cached") data by using the keyboard shortcut ``Cmd+Shift+R`` on Mac, and ``Ctrl+F5`` or ``Ctrl+Shift+R`` on Windows. 


Collaboration
=============
| Everyone is invited to develop this repository with good intentions.

License and Citation
====================
| The code is licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later).
| See `LICENSE.txt <LICENSE.txt>`_ for further information.
| Copyright: `© Reiner Lemoine Institut <https://reiner-lemoine-institut.de/>`_


.. |badge_license| image:: https://img.shields.io/github/license/rl-institut/meta_tool
    :target: LICENSE.txt
    :alt: License

.. |badge_contributing| image:: https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat
    :alt: contributions

.. |badge_repo_counts| image:: http://hits.dwyl.com/rl-institut/meta_tool.svg
    :alt: counter

.. |badge_contributors| image:: https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square
    :alt: contributors

.. |badge_issue_open| image:: https://img.shields.io/github/issues-raw/rl-institut/meta_tool
    :alt: open issues

.. |badge_issue_closes| image:: https://img.shields.io/github/issues-closed-raw/rl-institut/meta_tool
    :alt: closes issues

.. |badge_pr_open| image:: https://img.shields.io/github/issues-pr-raw/rl-institut/meta_tool
    :alt: closes issues

.. |badge_pr_closes| image:: https://img.shields.io/github/issues-pr-closed-raw/rl-institut/meta_tool
    :alt: closes issues
    
