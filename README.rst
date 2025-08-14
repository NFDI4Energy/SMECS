
Software Metadata Extraction and Curation Software (SMECS)
__________________________________________________________
| A web application to extract and curate research software metadata following the `CodeMeta <https://codemeta.github.io/>`_ (`version 3.0 <https://raw.githubusercontent.com/codemeta/codemeta/3.0/codemeta.jsonld>`_) software metadata standard.
|
| SMECS facilitates the extraction of research software metadata from GitHub and GitLab repositories. It provides a user-friendly graphical interface for visualizing the retrieved metadata, enabling researchers and research software engineers to create high-quality metadata without reentering information already available elsewhere. The curated metadata is exported as CodeMeta-compliant JSON, ensuring integration with other tools and enhancing the discoverability, reuse, and impact of research software.
|
|
| **Authors:** Stephan Ferenz, Aida Jafarbigloo
|
Phases in SMECS
__________________________________________________________
| The workflow of SMECS consists of four sequential phases: **Start**, **Extraction**, **Curation**, and **Export**.
|
|

.. image:: https://github.com/NFDI4Energy/SMECS/blob/master/docs/Extraction_via_hermes-1.png
   :alt: SMECS Workflow
   :width: 1000px

|
|

1. **Start Phase**
__________________________________________________________
In the Start phase, users provide two key inputs:
      - A repository link (GitHub or GitLab)
      - A personal access token for the corresponding platform
SMECS can operate without user-provided tokens for some repositories by using internal default tokens. However:
      - For other GitLab instances, a user-provided token is always required.
      - Providing a token can enable SMECS to extract more detailed metadata from certain repositories.
|
2. **Extraction Phase**
__________________________________________________________
The Extraction phase uses `HERMES <https://github.com/softwarepub/hermes>`_ harvesting steps to retrieve metadata from multiple sources. For details on the specific metadata fields, see: `Metadata Terms in SMECS <https://github.com/NFDI4Energy/SMECS/blob/master/docs/metadata-terms.md>`_. Once the inputs from the Start phase are submitted, SMECS initiates metadata retrieval using four HERMES harvesters:
      - GitHub
      - GitLab
      - CFF (`Citation File Format <https://citation-file-format.github.io/>`_)
      - CodeMeta
GitHub and GitLab metadata are harvested via the `HERMES GitHub/GitLab plugin <https://github.com/softwarepub/hermes-plugin-github-gitlab>`_.

All harvested metadata are mapped to CodeMeta using existing crosswalks from CodeMeta and HERMES, plus a custom crosswalk we created for GitLab.
The metadata are then processed and merged via the HERMES processing step, producing a unified set of metadata.
These results are displayed in the Curation phase. The HERMES-based approach ensures an interoperable, modular architecture that makes it easy to integrate additional harvesting sources in the future.

|
3. **Curation Phase**
__________________________________________________________
The Curation phase allows users to edit and refine the extracted metadata. The metadata are displayed in a form-based interface organized into four main tabs:
   #. General Information
   #. Provenance
   #. Related Persons
   #. Technical Aspects

Key visualization and curation features include:
   - **Metadata Visualization & User-Friendly Interface:** Metadata is displayed in a structured, easy-to-read format. The interface is intuitive, responsive, and allows smooth    navigation through metadata fields.
   - **Missing Metadata Identification:** SMECS flags fields where metadata is absent.
   - **Required Metadata Properties:** Certain fields are marked as mandatory to ensure completeness of the final output.
   - **Editable Fields:** Users can directly edit or correct metadata within the interface.
   - **Tagging Feature:** Some fields allow multiple values for better metadata organization.
   - **Suggestion Lists:** For selected fields, SMECS provides suggestions to reduce manual input and ensure consistency.
   - **Form-to-JSON Synchronization:** Updates in the form are mirrored in the JSON view (one-directional) so users can track changes instantly.


4. **Export Phase**
_________________________________________________________
In the Export phase, the curated metadata can be downloaded as a CodeMeta 3.0–compliant JSON file. Users can:
     - Include this file in their repository to make their research software more FAIR
     - Use it for other purposes, such as uploading metadata to a software registry
  
|
|
Installation and Usage
__________________________________________________________
Install from GitHub
----------

* Cloning the repository
.. code-block:: shell

   git clone https://github.com/NFDI4Energy/SMECS.git

* Creating virtual environment
     * Ensure that `Python 3.10 or higher <https://www.python.org/>`_ is installed on your system.
         - **Windows:** Check the version with ``py --version``. 
         - **Unix/MacOS:** Check the version with ``python3 --version``.
     * Create the virtual environment.
         * **Windows:** 
         .. code-block:: shell

            py -m venv my-env

         * **Unix/MacOS:**
         .. code-block:: shell

          python3 -m venv my-env

       | for more details visit `Creation of virtual environments <https://docs.python.org/3/library/venv.html>`_

     * Activate virtual environment.
         * **Windows:**
         .. code-block:: shell

          env\Scripts\activate

         * **Unix/MacOS:**
         .. code-block:: shell

          source env/bin/activate


       (Note that activating the virtual environment change the shell's prompt and show what virtual environment is being used.)

* Managing Packages with pip
   * Ensure you can run pip from command prompt.
      * **Windows:**
      .. code-block:: shell

         py -m pip --version

      * **Unix/MacOS:**
      .. code-block:: shell         
         
         python3 -m pip --version

   * Install a list of requirements specified in a *Requirements.txt*.
         * **Windows:** 
         .. code-block:: shell

          py -m pip install -r requirements.txt

         * **Unix/MacOS:** 
         .. code-block:: shell

          python3 -m pip install -r requirements.txt

   | for more details visit `Installing Packages <https://packaging.python.org/en/latest/tutorials/installing-packages/>`_
|   
|
* **Running the project**
    * Open and run the project in an editor (e.g. VS code).
    * Run the project.
        * **Windows:** 
        .. code-block:: shell

          py manage.py runserver

        * **Unix/MacOS:** 
        .. code-block:: shell

          python3 manage.py runserver

* To see the output on the browser follow the link shown in the terminal. (e.g. http://127.0.0.1:8000/)
|
|
Install through Docker
----------
To get started with SMECS using Docker, follow the steps below:

* Prerequisites
   * Make sure `Docker <https://www.docker.com/products/docker-desktop/>`_  is installed on your local machine.

* Cloning the Repository
.. code-block:: shell

   git clone https://github.com/NFDI4Energy/SMECS.git

* Navigate to the Project Directory
.. code-block:: shell

   cd smecs

* Building the Docker Images
.. code-block:: shell

   docker-compose build

* Starting the Services
.. code-block:: shell

   docker-compose up

* Accessing the Application
   * Navigate to ``http://localhost:8000`` in your web browser.

* Stopping the Services
.. code-block:: shell

   docker-compose down
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
| To see upcoming features in SMECS, please refer to our `open issues <https://github.com/NFDI4Energy/SMECS/issues?q=is%3Aopen+is%3Aissue>`_.
| To stay updated on upcoming changes to the `HERMES GitHub and GitLab Plugin <https://github.com/softwarepub/hermes-plugin-github-gitlab>`_, visit the `project’s issues page <https://github.com/softwarepub/hermes-plugin-github-gitlab/issues>`_. And if you have questions, suggestions, feedback, or need to report a bug, please open a new issue `there <https://github.com/softwarepub/hermes-plugin-github-gitlab/issues>`_.
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
    
