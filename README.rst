
Software Metadata Extraction and Curation Software (SMECS)
__________________________________________________________
| A web application to extract and curate research software metadata following the `codemeta <https://codemeta.github.io/>`_ software metadata standard.
|
| SMECS facilitates the extraction of research software metadata from repositories on GitHub/GitLab. It offers a user-friendly graphical user interface for visualizing the retrieved metadata. This empowers researchers to create good metadata for their research software without reentering data which is already available elsewhere. Ultimately, SMECS delivers the curated metadata in JSON format, enhancing usability and accessibility.
|
|
| **Authors:** Stephan Ferenz, Aida Jafarbigloo
|
Key Stages in SMECS
__________________________________________________________
| The figure below illustrates the sequential processes and data flows within SMECS. First, users input data, triggering the tool to extract metadata associated with specific URLs. This metadata is then visualized, allowing users to review and interact with it. Users can curate, modify, and finalize the metadata according to their needs. Once satisfied, they can download the curated metadata in JSON format, providing an interoperable output for further use.
|
|
.. image:: https://github.com/NFDI4Energy/SMECS/blob/63-add-flow-diagram-and-functionality-details-to-the-documentation/docs/diagram.png?raw=true
   :alt: SMECS Workflow Visualization
   :width: 1000px
|
#.  **Metadata Extraction Stage**
     * **Metadata Extraction**
        * SMECS extracts metadata from GitHub and GitLab repositories. For details on the specific metadata that SMECS can extract, please refer to `Metadata Terms in SMECS <https://github.com/NFDI4Energy/SMECS/blob/63-add-flow-diagram-and-functionality-details-to-the-documentation/docs/metadata-terms.md>`_
     * **API Interactions:** Use GitHub and GitLab APIs to fetch relevant metadata.
     * **Data Parsing:** Analyze the retrieved metadata and translate it into CodeMeta metadata for further processing.
     * **Cross-Walk and Metadata Mapping**
        * **Standardization:** Align metadata fields from GitHub and GitLab to a common dictionary.
        * **Field Matching:** Map equivalent fields between GitHub and GitLab. For example, mapping GitHub "topics" to GitLab "keywords".
#.  **Visualization and Curation Stage**
     * **Visualization:** Extracted metadata is displayed in a structured form.
     * **User Interface:** Interactive and simple UI for exploring the extracted and curated metadata.
     * **Metadata Curation:** Refine the extracted metadata based on user preferences.
     * **Missing Metadata Identification:** Identify and highlight fields where metadata is absent.
     * **User Input for Missing Metadata:** Enable users to add missing metadata directly via the user interface.
     * **Real-Time Metadata Curation:**  Enable the possibility of representing the JSON format of the metadata based on the CodeMeta standard in real time, allowing one-direction changes from form format to JSON to show real-time metadata curation.
#.  **Export Stage**
     * **Export Formats:** Save extracted and curated metadata in JSON format.
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
       | for more details visit `Creation of virtual environments <https://docs.python.org/3/library/venv.html>`_
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
   | for more details visit `Installing Packages <https://packaging.python.org/en/latest/tutorials/installing-packages/>`_
|   
|
**Running the project**

* Open the project in an editor. (e.g. VS code)
* Run the project in the editor. (Project runs on the virtual environment and activating the virtual environment will change shell’s prompt to show what virtual environment is being used)
* Go down to **meta_tool** directory in command line or terminal. (``cd meta_tool``)
* To run the project use subcommand **runserver**.
    * On Windows: Run ``py manage.py runserver``.
    * On Unix/MacOS: Run ``python3 manage.py runserver``.
* To see the output on the browser follow the link shown in the terminal. (e.g. http://127.0.0.1:8000/)
|
| **Setting Up GitLab/GitHub Personal Token**
| To enhance the functionality of this program and ensure secure interactions with the GitLab/GitHub API, users are required to provide their personal access token. Follow these steps to integrate your token:

* Generate a GitLab Token:
    * Visit `Create a personal access token <https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#create-a-personal-access-token>`_ for more information on how to generate a new token.
* Generate a GitHub Token:
    * Visit `Managing your personal access tokens <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>`_ for more information on how to generate a new token.
|
| **Tip for developers**
| If the page does not refresh correctly, clear the browser cache. You can force Chrome to pull in new data and ignore the saved ("cached") data by using the keyboard shortcut ``Cmd+Shift+R`` on Mac, and ``Ctrl+F5`` or ``Ctrl+Shift+R`` on Windows. 
|
Collaboration
__________________________________________________________
| We believe in the power of collaboration and welcome contributions from the community to enhance the SMECS workflow. Whether you have found a bug, have a feature idea, or want to share feedback, your contribution matters. Feel free to submit a pull request, open up an issue, or reach out with any questions or concerns.
|
To see upcoming features, please refer to our `open issues <https://github.com/NFDI4Energy/SMECS/issues?q=is%3Aopen+is%3Aissue>`_.

|
License and Citation
__________________________________________________________
| The code is licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later).
| See `LICENSE.txt <LICENSE.txt>`_ for further information.

|
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
    
