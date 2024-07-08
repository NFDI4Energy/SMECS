
Software Metadata Extraction and Curation Software (SMECS)
__________________________________________________________
| A web application to extract and curate software metadata following the `codemeta <https://codemeta.github.io/>`_ software metadata standard.
|
| SMECS facilitates the extraction of software metadata from repositories on GitHub/GitLab. It offers a user-friendly graphical user interface for visualizing the retrieved metadata. This empowers Research Software Engineers (RSE) to curate the extracted metadata according to their requirements. Ultimately, SMECS delivers the curated metadata in JSON format, enhancing usability and accessibility.
|
|
| The figure below illustrates the sequential processes and data flows within SMECS. First, users input data, triggering the tool to extract metadata associated with specific URLs. This metadata is then visualized, allowing users to review and interact with it. Users can curate, modify, and finalize the metadata according to their needs. Once satisfied, they can download the curated metadata in JSON format, providing an interoperable output for further use.
|
|
.. image:: https://github.com/NFDI4Energy/SMECS/blob/63-add-flow-diagram-and-functionality-details-to-the-documentation/docs/diagram.png?raw=true
   :alt: SMECS Workflow Visualization
   :width: 1000px
|
| **Authors:** Stephan Ferenz, Aida Jafarbigloo
|
| 



Installation and Usage
__________________________________________________________
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
       | for more details visit https://docs.python.org/3/library/venv.html
     * Activate virtual environment.
         * On Windows: Run ``env\Scripts\activate``. 
         * On Unix/MacOS: Run ``source env/bin/activate``.
       env is the selected name for the virtual environment.
       Note that activating the virtual environment change the shell's prompt and show what virtual
       environment is being used.
#. Managing Packages with pip
     * Ensure you can run pip from command prompt.
         * On Windows: Run ``py -m pip --version``.
         * On Unix/MacOS: Run ``python3 -m pip --version``.
     * Go to meta_tool directory. (``cd meta_tool``)
     * Install a list of requirements specified in a *Requirements.txt*.
         * On Windows: Run ``py -m pip install -r requirements.txt``.
         * On Unix/MacOS: Run ``python3 -m pip install -r requirements.txt``.
   | for more details visit https://packaging.python.org/en/latest/tutorials/installing-packages/ 
     


**Running the project**

* Open the project in an editor. (e.g. VS code)
* Run the project in the editor. (Project runs on the virtual environment and activating the virtual environment will change shell’s prompt to show what virtual environment is being used)
* Go down to **meta_tool** directory in command line or terminal. (``cd meta_tool``)
* To run the project use subcommand **runserver**.
    * On Windows: Run ``py manage.py runserver``.
    * On Unix/MacOS: Run ``python3 manage.py runserver``.
* To see the output on the browser follow the link shown in the terminal. (e.g. http://127.0.0.1:8000/)


**Tip for developers**

If the page does not refresh correctly, clear the browser cache. You can force Chrome to pull in new data and ignore the saved ("cached") data by using the keyboard shortcut ``Cmd+Shift+R`` on Mac, and ``Ctrl+F5`` or ``Ctrl+Shift+R`` on Windows. 


**Setting Up GitLab/GitHub Personal Token**

To enhance the functionality of this program and ensure secure interactions with the GitLab/GitHub API, users are required to provide their personal access token. Follow these steps to integrate your token:

* Generate a GitLab Token:
    * Visit `Create a personal access token <https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#create-a-personal-access-token>`_ for more information on how to generate a new token.


* Generate a GitHub Token:
    * Visit `Managing your personal access tokens <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>`_ for more information on how to generate a new token.


Collaboration
__________________________________________________________
| We believe in the power of collaboration and welcome contributions from the community to enhance the SMECS workflow. Whether you have found a bug, have a feature idea, or want to share feedback, your contribution matters. Feel free to submit a pull request, open up an issue, or reach out with any questions or concerns.
|
To see upcoming features, please refer to our `open issues <https://gitlab.com/zdin-zle/zle-platform/repository/meta_tool/-/issues>`_.


License and Citation
__________________________________________________________
| The code is licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later).
| See `LICENSE.txt <LICENSE.txt>`_ for further information.


Acknowledgements
__________________________________________________________
We would like to thank `meta_tool <https://github.com/rl-institut/meta_tool>`_ for providing the foundational framework upon which this project is built.


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
    
