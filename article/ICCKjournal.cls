%%
%% LaTeX Tempplate for ICCK Journal
%% A plain single-column layout for articles.
%%
%% Created by www.ICCK.org
%%
%% 2021/11/30 v2.0
%%
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{ICCKjournal}[2021/11/30, v2.0 An sample template]

\newif\if@lineno
\DeclareOption{lineno}{\@linenotrue}

\newif\ifproof
\DeclareOption{proof}{\global\prooftrue}

\DeclareOption{onehalfspacing}{\AtBeginDocument{\linespread{1.5}}}
\DeclareOption{doublespacing}{\AtBeginDocument{\linespread{2}}}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions*
\LoadClass[11pt,twoside]{article}

% -- tex program
\RequirePackage{ifxetex,ifluatex}
\newif\ifxetexorluatex
\ifxetex\xetexorluatextrue
\else\ifluatex\xetexorluatextrue
\else\xetexorluatexfalse\fi\fi

\RequirePackage{etoolbox}
\RequirePackage{xparse}
\RequirePackage{calc}
\AtEndOfClass{%
    \RequirePackage{microtype}%
    \ifxetex\renewcommand{\lsstyle}{\addfontfeatures{LetterSpace=10}}\fi%
}

\ifproof
  \RequirePackage{pdfpages}
  \RequirePackage{draftwatermark}
  \SetWatermarkText{\sffamily\bfseries ICCK Proof}
  \SetWatermarkScale{1}
\fi

% -- font settings
\ifxetexorluatex
    \RequirePackage{fontspec}
%    \setmainfont{Amiri}[%
%    Path=fonts/,
%    Extension=.ttf,%
%    UprightFont=*-Regular,
%    BoldFont=*-Bold,
%    ItalicFont=*-Italic,
%    BoldItalicFont=*-BoldItalic]
    \setmainfont{texgyrepagella}[%
    Extension=.otf,%
    UprightFont=*-regular,
    BoldFont=*-bold,
    ItalicFont=*-italic,
    BoldItalicFont=*-bolditalic]
\else
    \RequirePackage[utf8]{inputenc}
    \RequirePackage[T1]{fontenc}
    \RequirePackage{tgpagella}
\fi
\RequirePackage[defaultsans,scale=0.85]{lato}              % sans font
% \renewcommand{\familydefault}{\sfdefault}
\RequirePackage[defaultmono,scale=0.8]{droidsansmono}      % mono font
% \RequirePackage[cmintegrals,nosymbolsc]{newtxsf} % math font

% -- layout
\RequirePackage{geometry}%

\if@twocolumn

\geometry{%
    a4paper,%
 %   showframe,
    % asymmetric,
    left=13mm,%
    right=13mm,%
    top=25mm,%
    bottom=22.5mm,%
    headsep=14mm,
    headheight=12pt,%
    % reversemarginpar,%
    % marginparwidth=48mm,%
    % marginparsep=4mm,%
    %showframe
}

\newlength{\class@leftmargin}
\setlength\class@leftmargin{\Gm@lmargin-\Gm@rmargin}
\newlength{\class@textwidth}
\setlength\class@textwidth{\textwidth+\class@leftmargin}


\else


\geometry{%
    a4paper,%
 %   showframe,
    asymmetric,
    left=65mm,%
    right=13mm,%
    top=25mm,%
    bottom=22.5mm,%
    headsep=14mm,
    headheight=12pt,%
    reversemarginpar,%
    marginparwidth=48mm,%
    marginparsep=4mm,%
    %showframe
}
\newlength{\class@leftmargin}
\setlength\class@leftmargin{\Gm@lmargin-\Gm@rmargin}
\newlength{\class@textwidth}
\setlength\class@textwidth{\textwidth+\class@leftmargin}


\fi




\if@twocolumn

\let\fullwidth\empty
\let\endfullwidth\empty

\def\prooffullwidth{\if@lineno\nolinenumbers\fi\begingroup\hskip-\class@leftmargin\begin{minipage}{\textwidth}}
\def\endprooffullwidth{\end{minipage}\endgroup\par}

\else

\def\fullwidth{\if@lineno\nolinenumbers\fi\begingroup\hskip-\class@leftmargin\begin{minipage}{\textwidth+\class@leftmargin}}
\def\endfullwidth{\end{minipage}\endgroup\par}

\def\prooffullwidth{\if@lineno\nolinenumbers\fi\begingroup\hskip-\class@leftmargin\begin{minipage}{\textwidth+\class@leftmargin}}
\def\endprooffullwidth{\end{minipage}\endgroup\par}

\fi

% -- load packages
\RequirePackage[framemethod=TikZ]{mdframed}
\RequirePackage{marginnote}
\RequirePackage{changepage}
\RequirePackage{parskip}


% -- figures and tables
\RequirePackage{graphicx}
\RequirePackage{subfigure}
\RequirePackage{multirow}
\RequirePackage{xcolor}
\RequirePackage{booktabs}
\RequirePackage{threeparttable}
\RequirePackage{caption}
\graphicspath{{res/}}
\captionsetup{%
font={rm,small},labelfont={bf,sf,normalsize},%
labelsep=period,%
skip=4pt,tableposition=top,%
singlelinecheck=false,%
justification=centering}
\captionsetup[subfigure]{font={rm,small}}
\definecolor{main}{HTML}{000000}  % #ef3c82, Color

% -- bibliography
\RequirePackage[numbers,sort&compress]{natbib}
%\RequirePackage[resetlabels]{multibib}
%\newcites{@citation}{Citation}
%\RequirePackage{bibentry}
%\nobibliography*
%% reset urlstyle in bibentry
%\AtBeginDocument{\patchcmd{\doi}{\urlstyle{rm}}{\urlstyle{sf}}{}{}}
%\def\bibfont{\small}
%\bibliographystyle{unsrt}
%\bibliographystyle@citation{unsrt}
% \RequirePackage[backend=biber,natbib,style=numeric-comp,sorting=none,defernumbers=true]{biblatex}
% \DeclareBibliographyCategory{fullcited}
% \addtocategory{fullcited}{citation}
%\addbibresource[glob]{*.bib}
% \addbibresource{citation.bib}

\renewcommand{\bibfont}{\small}
\setlength\bibsep{3pt}


% -- article metadata
\RequirePackage{xkeyval}
\RequirePackage{kvsetkeys}
\RequirePackage{newfile}
\RequirePackage{tikzpagenodes}
\NewDocumentCommand\class@define@key{m}{%
    \csdef{class@set@#1}##1{\csdef{class@#1}{##1}}
    \define@key{class}{#1}{\csuse{class@set@#1}{##1}}}
\NewDocumentCommand{\class@setkeys}{m}{\kvsetkeys{class}{#1}}

% \newoutputstream{citation}
% \openoutputfile{citation.bib}{citation}
\def\jnlsetup#1{%
\class@setkeys{#1}
}

% - articletype
\class@define@key{arcticletype}
\def\articletype#1{\gdef\class@articletype{#1}}

% - bibtex fields
\class@define@key{author}
\class@define@key{journal}
\class@define@key{title}
\class@define@key{ctitle}
\class@define@key{volume}
\class@define@key{number}
\class@define@key{pages}
\class@define@key{year}
\class@define@key{doi}
\class@define@key{options}

% - abstract
\class@define@key{abstract}
\def\abstractnamefont{\rmfamily\bfseries\normalsize\color{main}}
\def\abstractfont{\rmfamily\normalsize\textbf}
\def\abstractname{Abstract}
\def\preabstractskip{\z@}
\def\afterabstractskip{0.8\baselineskip}
\def\abstract@#1{%
    \linenumbershook
    \vskip\preabstractskip
    \section*{\abstractname}
    {\noindent\ignorespaces\abstractfont #1}\par\vskip\afterabstractskip}
\def\abstract#1{%
    \gdef\class@abstract{#1}%
    \abstract@\class@abstract%
    \let\abstract\relax}

% - keywords
\class@define@key{keywords}
\def\keywordnamefont{\rmfamily\bfseries\normalsize}
\def\keywordfont{\rmfamily\small}
\def\keyworddot{:~}
\def\keywordname{Keywords} % Defines the keywords heading name
\def\prekeywordskip{\z@}
\def\afterkeywordskip{0.5\baselineskip}
\def\keywords@#1{%
    \vskip\prekeywordskip
    {\noindent\keywordnamefont\keywordname}\keyworddot%
    {\noindent\ignorespaces\keywordfont #1}\par\vskip\afterkeywordskip}
\def\keywords#1{%
    \gdef\class@keywords{#1}%
    \keywords@{\class@keywords}%
    \let\keywords\relax}

% - orcid
\def\orcidicon{\raisebox{-.3ex}{\includegraphics[height=2.0ex]{orcid.pdf}}}
\newbox{\orcidbox}
\sbox{\orcidbox}{\orcidicon}
\newcommand{\orcid}[1]{\href{https://orcid.org/#1}{\usebox{\orcidbox}}}

% - doi
\def\doiicon{\raisebox{-.3ex}{\includegraphics[height=2.18ex]{doi.png}}}

% - editors info
\let\class@editors\empty
\NewDocumentCommand{\editor}{o m}{%
    \ifx\empty\class@editors\else\appto{\class@editors}{\\}\fi
    \IfValueTF{#1}{\appto{\class@editors}{\makebox[12pt][r]{\orcid{#1}~}#2}}{\appto{\class@editors}{#2}}
}

% - date info
\newcommand{\submitdate}[1]{\def\class@submitdate{#1}}
\newcommand{\acceptdate}[1]{\def\class@acceptdate{#1}}
\newcommand{\pubdate}[1]{\def\class@pubdate{#1}}
\newcommand{\paperlink}[1]{\def\class@paperlink{#1}}

% - \pkg{authblk}
\RequirePackage{authblk}
\RequirePackage[misc]{ifsym}
\renewcommand\Authands{ and }
\renewcommand\Authfont{\fontsize{12}{14}\rmfamily\bfseries}
\renewcommand\Affilfont{\fontsize{10}{12}\rmfamily\mdseries}
%\renewcommand\AB@authnote[1]{\textsuperscript{#1}}
%\renewcommand\AB@affilnote[1]{\textsuperscript{#1}}
\renewcommand\AB@affilnote[1]{\makebox[\z@][r]{\textsuperscript{\normalfont #1\,}}}
\let\authblk@author\author
\let\class@corrauthor\empty
\RenewDocumentCommand{\author}{ o o m o}{%
    \IfValueTF{#2}{%
        \authblk@author[#1,*]{#3\IfValueTF{#4}{\orcid{#4}}{}}%
        \ifx\empty\class@corrauthor\else\appto{\class@corrauthor}{\\}\fi
        \appto{\class@corrauthor}{\makebox[10pt][r]{\raisebox{.25ex}{\scriptsize\Letter~}}#3\par\href{mailto:#2}{#2}}
    }{%
        \authblk@author[#1]{#3\IfValueTF{#4}{\orcid{#4}}{}}%
    }%
}

\RequirePackage{ragged2e}
% - thanks
\let\thanks\empty
\let\class@thanks\empty
\RenewDocumentCommand\thanks{o m}{%
\ifx\class@thanks\empty\else\appto{\class@thanks}{\par\vspace{10pt}}\fi
\IfValueTF{#1}%
{\appto{\class@thanks}{\makebox[\z@][r]{\textsuperscript{#1}~}#2}}%
{\appto{\class@thanks}{#2}}
}

% -- maketitle
%\RequirePackage[absolute]{textpos}
\if@twocolumn
\renewcommand{\@maketitle}{%
    \def\@makefnmark{}%
    % \begin{adjustwidth}{-\class@leftmargin}{\z@}
        \begingroup
        \vspace*{3pt}
        {\sffamily\upshape\large\lsstyle\MakeUppercase{\class@articletype}}
        \par \vspace*{-1.75em}\hfill
        \href{http://crossmark.crossref.org/dialog/?doi=\class@doi&domain=pdf}{\includegraphics[width=1.2cm]{Crossmark}}
        \par \vspace{.6em}
        {\raggedright\rmfamily\bfseries\fontsize{20}{25}\selectfont\class@title\par}%
        \vspace{2em}
        {\raggedright\@author}
        \par\vspace{20\p@}
        \endgroup
    % \end{adjustwidth}
}

\newcommand{\margininfo}{
\begingroup%
\renewcommand\thefootnote{\@fnsymbol\c@footnote}%
\def\@makefnmark{\rlap{\@textsuperscript{\normalfont\@thefnmark}}}%
\footnotetext{
  \raggedright\footnotesize\upshape\linespread{1.05}\selectfont%
  \ifdefvoid{\class@paperlink}{}{\\[1pt]\class@paperlink}
  \par\vspace{5\p@}
  \ifdefvoid{\class@editors}{}{\textbf{Academic Editor:~}\\\class@editors}%
  \par\vspace{10\p@}
  \ifdefvoid{\class@submitdate}{}{\textbf{Submitted:~}\class@submitdate\\}%
  \ifdefvoid{\class@acceptdate}{}{\textbf{Accepted:~}\class@acceptdate\\}%
  \ifdefvoid{\class@pubdate}{}{\textbf{Published:~}\class@pubdate}%
  \par\vspace{10\p@}
  {\textbf{\textrm{Vol.}~}\class@volume,~\textbf{\textrm{No.}~}\class@number,~\class@year.\\}
  {%\textbf{\textsc{Doi}\,:~}\\
  \makebox[10\p@][r]{\doiicon\,}\href{http://dx.doi.org/\class@doi}{\class@doi}}
  \par\vspace{10\p@}
  \ifdefvoid{\class@corrauthor}{}{\textbf{\makebox[3\p@][r]{*}Corresponding author:~}\\\class@corrauthor}%
  \ifdefvoid{\class@thanks}{}{%\parbox[b]{38mm}
      {\par\vspace{7\p@}\class@thanks}}%
}%
\endgroup%
}

\apptocmd{\maketitle}{\margininfo\thispagestyle{opening}}{}{}

\else

\renewcommand{\@maketitle}{%
    \def\@makefnmark{}%
    \begin{adjustwidth}{-\class@leftmargin}{\z@}
        \begingroup
        {\sffamily\upshape\large\lsstyle\MakeUppercase{\class@articletype}}
        \par \vspace*{-2.85em}\hfill
        \href{http://crossmark.crossref.org/dialog/?doi=\class@doi&domain=pdf}{\includegraphics[width=1.2cm]{Crossmark}}
        \par \vspace{-4\p@}
        {\raggedright\rmfamily\bfseries\fontsize{20}{25}\selectfont\class@title}%
        \par\vspace{10\p@}
        {\raggedright\@author}
        \par\vspace{12\p@}
        \endgroup
    \end{adjustwidth}

\enlargethispage{-5.7\baselineskip}
\tikz[remember picture,overlay,inner sep=0pt,outer sep=0pt]{
\node[anchor=south west] (text1) at ([xshift=-4.8cm]current page text area.south west) {
\parbox{.87\class@textwidth}{\hangindent 7.6cm\hangafter -20\footnotesize Copyright \textcopyright{} 2022 by the authors. Published by ICCK. This article is an open access article distributed under the terms and conditions of the Creative Commons Attribution (CC BY) license (\url{https://creativecommons.org/licenses/by/4.0/}).
}};
\node[anchor=north west] at ([xshift=4.8cm, yshift=-0.3cm]text1.north west) {\includegraphics[width=2.4cm]{CC_BY}};
\node[anchor=north west] at ([xshift=.025\class@textwidth, yshift=0.05cm]text1.north east) {\includegraphics[width=.085\class@textwidth,height=.085\class@textwidth]{qrcode}};
}

%    \begin{textblock*}{\class@leftmargin-2em}[0,1](\Gm@rmargin,\paperheight-\Gm@bmargin)
    \marginpar{\vskip6mm
        \raggedright\footnotesize\upshape\linespread{1.05}\selectfont%
        \ifdefvoid{\class@editors}{}{\textbf{Academic Editor:~}\\\class@editors}%
        \par\vspace{10\p@}
        \ifdefvoid{\class@submitdate}{}{\textbf{Submitted:~}\class@submitdate\\}%
        \ifdefvoid{\class@acceptdate}{}{\textbf{Accepted:~}\class@acceptdate\\}%
        \ifdefvoid{\class@pubdate}{}{\textbf{Published:~}\class@pubdate}%
        \par\vspace{10\p@}
        {\textbf{\textrm{Vol.}~}\class@volume,~\textbf{\textrm{No.}~}\class@number,~\class@year.\\}
        {%\textbf{\textsc{Doi}\,:~}\\
        \makebox[10\p@][r]{\doiicon\,}\href{http://dx.doi.org/\class@doi}{\class@doi}}
        \par\vspace{10\p@}
        \ifdefvoid{\class@corrauthor}{}{\textbf{\makebox[3\p@][r]{*}Correspondence Author:~}\\\class@corrauthor}%
        \par\vspace{10\p@}
        \ifdefvoid{\class@paperlink}{}{\class@paperlink}
        \par\vspace{10\p@}
        \ifdefvoid{\class@thanks}{}{%\parbox[b]{38mm}
            {\class@thanks}}
    }
%    \end{textblock*}
}
\apptocmd{\maketitle}{\thispagestyle{opening}}{}{}

\fi

% -- citation box
\def\citationname{Citation}
\def\citationnamefont{\sffamily\bfseries}
\def\citationfont{\sffamily\small}
\def\pubnotefont{\small\sffamily}
\def\class@pubnote{%
\textcopyright~2022~ICCK (Institute of Central Computation and Knowledge)}
\def\dataavail#1{\gdef\class@dataavail{#1}}
% \gdef\class@citetiontext{\class@author\ ``\class@title''. In: \textit{\class@journal} \class@volume.\class@number\ (\class@year), pp.~\class@pages. DOI: \class@doi
%  }

\newcommand{\citationblock}{%
%    \nobibliography{citation}
%    \nocite@relpub{#3}
%    \renewcommand{\bibsection}{\subsection*{\refname}}
\begin{mdframed}[%
    backgroundcolor=black!10!white,
    topline=false,
    bottomline=false,
    rightline=false,
    leftline=false,
    font=\rmfamily,
    leftmargin=6\p@,
    rightmargin=6\p@,
    innertopmargin=8\p@,%
    innerbottommargin=8\p@,
    innerleftmargin=6\p@,
    innerrightmargin=6\p@,
    roundcorner=6pt
    ]%\if@lineno\internallinenumbers \fi%
    % \vspace*{-.8em}\bibliography@relpub{#2}
    \hypersetup{colorlinks=false,allcolors=black}
    {\noindent\citationnamefont\citationname}\\
    {\citationfont \class@author\ (\class@year). \class@ctitle. \textit{\class@journal}, \class@volume(\class@number), \thepage--\pageref{LastPage}.}
    \if@twocolumn
    \par\vspace{5\p@}
    % {{\noindent\pubnotenamefont\pubnotename}\\
    % {\noindent\citationnamefont Data Availability}\\
    % {\citationfont \class@dataavail}
    % \par\vspace{5\p@}
    {\pubnotefont\class@pubnote}%
    \fi
    \end{mdframed}%\medskip
}

\AtEndDocument{\label{LastPage}}

\if@twocolumn

\def\class@logo{\includegraphics[scale=.025]{pub-logo}}
\def\class@markfont{\sffamily\normalsize}
\def\rh@rule{\leavevmode\lower6pt\hbox to0pt{\vrule height.8pt width\class@textwidth\hss}}
\def\ps@opening{%
    \def\@oddhead{\rh@rule{\class@logo}\hfill
    \parbox[b]{.6\textwidth}{\raggedleft\class@markfont\class@journal\\\url{http://dx.doi.org/\class@doi}}}%
    \let\@evenhead\@oddhead
    \def\@oddfoot{\hfill{\class@markfont\thepage}}
    \def\@evenfoot{{\class@markfont\thepage}\hfill{}}%
    % \def\@evenfoot{\class@logo \hfill}
    }

% ps::headings
\def\runningtitle#1{\gdef\class@runningtitle}
\def\class@runningtitle{\class@journal}
\def\myleftmark{\class@runningauthor}%
\def\myrightmark{\class@runningtitle}%
\def\ps@headings{%
  \def\@oddfoot{\hfill{\class@markfont\thepage}}%
  \def\@evenfoot{{\class@markfont\thepage}\hfill{}}%
  % \let\@evenfoot\@oddfoot
  \def\@evenhead{\rh@rule \class@markfont\myrightmark\hfill\class@logo}
  \def\@oddhead{\rh@rule \class@logo\hfill\class@markfont\myrightmark}
}

\else
% -- pagestyles
% ps::opening
\def\class@logo{\includegraphics[scale=.06]{pub-logo}}
\def\class@markfont{\sffamily\normalsize}
\def\rh@rule{\leavevmode\lower6pt\hbox to0pt{\kern-\class@leftmargin\vrule height.8pt width\class@textwidth\hss}}
\def\ps@opening{%
    \def\@oddhead{\rh@rule\kern-\class@leftmargin{\class@logo}\hfill
    \parbox[b]{\textwidth}{\raggedleft\class@markfont\class@journal\\\url{http://dx.doi.org/\class@doi}}}%
    \let\@evenhead\@oddhead
    \def\@oddfoot{\hfill{\class@markfont\thepage}}
    \def\@evenfoot{\hfill{\class@markfont\thepage}}
    % \def\@evenfoot{\class@logo \hfill}
    }

% ps::headings
\def\runningtitle#1{\gdef\class@runningtitle}
\def\class@runningtitle{\class@journal}
\def\myleftmark{\class@runningauthor}%
\def\myrightmark{\class@runningtitle}%
\def\ps@headings{%
  \def\@oddfoot{\hfill{\class@markfont\thepage}}%
  \let\@evenfoot\@oddfoot
  \def\@evenhead{\rh@rule\kern-\class@leftmargin\class@markfont\myrightmark\hfill\class@logo}
  \def\@oddhead{\rh@rule\kern-\class@leftmargin\class@logo\hfill\class@markfont\myrightmark}
}
\fi


\pagestyle{headings}

% -- line numbers
\def\emptyline{\par\vspace{-\baselineskip}}
\if@lineno
  \if@twocolumn
    \RequirePackage[switch]{lineno}
  \else
    \RequirePackage{lineno}
  \fi
  \let\linenumbershook\linenumbers
\else
  \let\linenumbershook\empty
  \let\rightlinenumbers\relax
\fi

% -- section/subsection/paragraph set-up
\RequirePackage[explicit]{titlesec}
\titleformat{\section}
  {\large\rmfamily\bfseries\color{main}}
  {\thesection}
  {0.5em}
  {#1}
  []
\titleformat{name=\section,numberless}
  {\large\rmfamily\bfseries\color{main}}
  {}
  {0em}
  {#1}
  []
\titleformat{\subsection}
  {\rmfamily\bfseries}
  {\thesubsection}
  {0.5em}
  {#1}
  []
\titleformat{\subsubsection}
  {\rmfamily\itshape}
  {\thesubsubsection}
  {0.5em}
  {#1}
  []
\titleformat{\paragraph}[runin]
  {\rmfamily\bfseries}
  {}
  {0em}
  {#1}
\titlespacing*{\section}{0pc}{3ex \@plus4pt \@minus3pt}{5pt}
\titlespacing*{\subsection}{0pc}{2.5ex \@plus5pt \@minus2pt}{3pt}
\titlespacing*{\subsubsection}{0pc}{2ex \@plus4.5pt \@minus1.5pt}{2pt}
\titlespacing*{\paragraph}{0pc}{1.5ex \@plus4pt \@minus1pt}{10pt}

% -- special sections
\def\conflictsofinterest{\section*{Conflicts of Interest}}
\def\acknowledgement{\section*{Funding}}

% -- biography
\RequirePackage{wrapfig}
\newlength\biobeforeskip\setlength\biobeforeskip{20pt}
\newlength\bioafterskip\setlength\bioafterskip{0pt}
\def\biofont{\rmfamily\small}
\NewDocumentCommand{\ASPbiography}{ O{width=1in,height=1.25in} m m }{%
\if@lineno\nolinenumbers\fi
% \begingroup
% \centering
% \vskip\biobeforeskip
\begin{minipage}{.485\textwidth}
%\begin{quote}
\begin{wrapfigure}{L}[0pt]{1.0in}
    \vskip-.75\baselineskip
    \centering\includegraphics[#1]{#2}
    \vskip-.75\baselineskip
\end{wrapfigure}
\par\biofont#3
%\end{quote}
\end{minipage}
% \vskip\bioafterskip
% \endgroup
}


% MYtran class scratch pad registers
% dimen
\newdimen\@MYtrantmpdimenA
\newdimen\@MYtrantmpdimenB
% count
\newcount\@MYtrantmpcountA
\newcount\@MYtrantmpcountB
% token list
\newtoks\@MYtrantmptoksA

\def\@MYtranneedspace#1#2{\penalty-100\begingroup%shield temp variable
\@MYtrantmpdimenB\pagegoal\advance\@MYtrantmpdimenB-\pagetotal% space left
\ifdim #1>\@MYtrantmpdimenB\relax% not enough space left
\ifdim\@MYtrantmpdimenB>\z@\relax #2\fi%
\newpage%
\fi\endgroup}
\begingroup
\catcode`\Q=3
\long\gdef\@ifmtarg#1{\@xifmtarg#1QQ\@secondoftwo\@firstoftwo\@nil}
\long\gdef\@xifmtarg#1#2Q#3#4#5\@nil{#4}
\endgroup

\newcounter{MYbiography}
\setcounter{MYbiography}{0}

% photo area size
\def\@MYBIOphotowidth{1in}    % width of the biography photo area
\def\@MYBIOphotodepth{1.33in}   % depth (height) of the biography photo area
% area cleared for photo
\def\@MYBIOhangwidth{1.05in}    % width cleared for the biography photo area
\def\@MYBIOhangdepth{1.43in}    % depth cleared for the biography photo area
                                  % actual depth will be a multiple of
                                  % \baselineskip, rounded up
\def\@MYBIOskipN{2\baselineskip}% nominal value of the vskip above the biography

\newenvironment{biography}[2][]{\normalfont{\sffamily}\footnotesize%
\unitlength 1in\parskip=0pt\par\parindent 1em\interlinepenalty500%
% we need enough space to support the hanging indent
% the nominal value of the spacer
% and one extra line for good measure
\@MYtrantmpdimenA=\@MYBIOhangdepth%
\advance\@MYtrantmpdimenA by \@MYBIOskipN%
\advance\@MYtrantmpdimenA by 1\baselineskip%
% if this page does not have enough space, break it and lets start
% with a new one
\@MYtranneedspace{\@MYtrantmpdimenA}{\relax}%
% nominal spacer can strech, not shrink use 1fil so user can out stretch with \vfill
\vskip \@MYBIOskipN plus 0pt minus 0\baselineskip%
% the default box for where the photo goes
\def\@MYtempbiographybox{{\setlength{\fboxsep}{0pt}\framebox{%
\begin{minipage}[b][\@MYBIOphotodepth][c]{\@MYBIOphotowidth}\centering PLACE\\ PHOTO\\ HERE \end{minipage}}}}%
%
% detect if the optional argument was supplied, this requires the
% \@ifmtarg command as defined in the appendix section above
% and if so, override the default box with what they want
\@ifmtarg{#1}{\relax}{\def\@MYtempbiographybox{\mbox{\begin{minipage}[b][\@MYBIOphotodepth][c]{\@MYBIOphotowidth}%
\centering%
\includegraphics[width=1in,height=1.33in]{#1}%
\end{minipage}}}}% end if optional argument supplied
% Make an entry into the table of contents only if we have not done so before
%\if@MYbiographyTOCentrynotmade%
%% link labels to the biography counter so hyperref will jump
%% to the biography, not the previous section
%\setcounter{MYbiography}{-1}%
%\refstepcounter{MYbiography}%
%\addcontentsline{toc}{section}{Biographies}%
%\global\@MYbiographyTOCentrynotmadefalse%
%\fi%
% one more biography
\refstepcounter{MYbiography}%
% Make an entry for this name into the table of contents
\addcontentsline{toc}{subsection}{#2}%
% V1.6 properly handle if a new paragraph should occur while the
% hanging indent is still active. Do this by redefining \par so
% that it will not start a new paragraph. (But it will appear to the
% user as if it did.) Also, strip any leading pars, newlines, or spaces.
\let\@MYBIOORGparCMD=\par% save the original \par command
\edef\par{\hfil\break\indent}% the new \par will not be a "real" \par
\settoheight{\@MYtrantmpdimenA}{\@MYtempbiographybox}% get height of biography box
\@MYtrantmpdimenB=\@MYBIOhangdepth%
\@MYtrantmpcountA=\@MYtrantmpdimenB% countA has the hang depth
\divide\@MYtrantmpcountA by \baselineskip%  calculates lines needed to produce the hang depth
\advance\@MYtrantmpcountA by 1% ensure we overestimate
% set the hanging indent
\hangindent\@MYBIOhangwidth%
\hangafter-\@MYtrantmpcountA%
% reference the top of the photo area to the top of a capital T
\settoheight{\@MYtrantmpdimenB}{\mbox{T}}%
% set the photo box, give it zero width and height so as not to disturb anything
\noindent\makebox[0pt][l]{\hspace{-\@MYBIOhangwidth}\raisebox{\@MYtrantmpdimenB}[0pt][0pt]{%
\raisebox{-\@MYBIOphotodepth}[0pt][0pt]{\@MYtempbiographybox}}}%
% now place the author name and begin the bio text
\noindent{\textbf{#2}}}{\relax\let\par=\@MYBIOORGparCMD\par%
% 7/2001 V1.5 detect when the biography text is shorter than the photo area
% and pad the unused area - preventing a collision from the next biography entry
% MDS
\ifnum \prevgraf <\@MYtrantmpcountA\relax% detect when the biography text is shorter than the photo
    \advance\@MYtrantmpcountA by -\prevgraf% calculate how many lines we need to pad
    \advance\@MYtrantmpcountA by -1\relax% we compensate for the fact that we indented an extra line
    \@MYtrantmpdimenA=\baselineskip% calculate the length of the padding
    \multiply\@MYtrantmpdimenA by \@MYtrantmpcountA%
    \noindent\rule{0pt}{\@MYtrantmpdimenA}% insert an invisible support strut
\fi%
\par\normalfont}


% V1.6
% added biography without a photo environment
\newenvironment{biographynophoto}[1]{%
% one more biography
\refstepcounter{MYbiography}%
% Make an entry for this name into the table of contents
\addcontentsline{toc}{subsection}{#1}%
\normalfont{\sffamily}\footnotesize\interlinepenalty500%
\vskip \@MYBIOskipN plus 0pt minus 0\baselineskip%
\parskip=0pt\par%
\noindent\textbf{#1\ }}{\relax\par\normalfont}


\definecolor{urlcolor}{HTML}{0774B7}

\AtEndPreamble{%
  \RequirePackage{hyperref}
  \hypersetup{%
    colorlinks,
    allcolors=black,
    linkcolor=red!30!black,
    citecolor=red!30!black,
    urlcolor=red!30!black,
    pdfauthor={\class@author},
    pdftitle={\class@title},
    pdfkeywords={},
    pdfproducer={ICCK},
    pdfcreator={ICCK}}
  \urlstyle{sf}
  \def\UrlBreaks{%
      \do\/%
      \do\a\do\b\do\c\do\d\do\e\do\f\do\g\do\h\do\i\do\j\do\k\do\l%
      \do\m\do\n\do\o\do\p\do\q\do\r\do\s\do\t\do\u\do\v\do\w\do\x\do\y\do\z%
      \do\A\do\B\do\C\do\D\do\E\do\F\do\G\do\H\do\I\do\J\do\K\do\L%
      \do\M\do\N\do\O\do\P\do\Q\do\R\do\S\do\T\do\U\do\V\do\W\do\X\do\Y\do\Z%
      \do0\do1\do2\do3\do4\do5\do6\do7\do8\do9\do=\do/\do.\do:%
      \do\*\do\-\do\~\do\'\do\"\do\-}
  \Urlmuskip=0mu plus 0.1mu
}
