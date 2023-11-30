# OpenShitsuChan
OpenSource version of Shitsu-chan 

# How to start
1. Create a database
2. Configure `project.config.json`
3. Load a backup file from `/assets/dump` into your Postgres database
4. Run `npm start`
5. .. and you are done !

[Demo (Youtube)](https://www.youtube.com/watch?v=64XqnAYPH80)

# Introduction
The user thinks of a character without telling the computer who, the computer then makes
guesses by asking questions efficiently and if the character is not in the knowledge base, the user
can contribute by submitting the character they had in mind.

# How?
First thing we know is that, initially, each character have an equal chance of being chosen.

$$
P(H) = \dfrac{1}{T} \space \space \space (1)
\newline
P(\neg{H}) = \dfrac{1}{T} \space \space \space (2)
$$
Second thing we would like to know is how do we calculate the probability that a hypothesis H is
true given the available evidences?

A simple way to implement this idea mathematically is to use the Bayes’ theorem.
In the general case, if H and E are two dependent events then,

$$ P(H \land E) = P(H)P(E|H) = P(E)P(H|E) $$
$$
P(H|E) = \dfrac{P(H)P(E|H)}{P(E)} 
\space \space \space (3)
$$

Read as “probability of hypothesis H given the evidence E”.

We know that for any event X,

$$
P(X) + P(\neg{X}) = 1
\space \space \space (4)
$$

By applying the Bayes’ theorem on $(4)$ and using $(3)$
$$
\dfrac{P(X)P(Y|X)}{P(Y)} + \dfrac{P(\neg{X})P(Y|\neg{X})}{P(Y)} = 1 
$$

We can then write the Bayes’ theorem in a much more compact way by replacing the denominator:

$$
P(H|E) = \dfrac{P(H)P(E|H)}{P(H)P(E|H) + P(\neg{H})P(E|\neg{H})}
\space \space \space (5) 
$$

For a more general case in which we provide more than a single evidence we have,

$$
P(H|E_1 \land E_2 \land .. \land E_N ) = 
\dfrac
    {P(H) \prod_{k}^{} {P(E_k|H)}}
    {P(H) \prod_{k}^{} {P(E_k|H)} + P(\neg{H}) \prod_{k}^{} {P(E_k|\neg{H})}} 
\space \space \space (6)
$$

Simply because for any event X, Y and Z: 
$P(X ∧ Y|Z) = P(X|Z)P(Y|Z)$

# Modeling
## Computing $P(E_k|H)$
Since we need to implement the idea that when the user’s response matches ours then $P(E_k|H) = 1 - \epsilon, (\epsilon > 0) $, we can model this by defining a normalized distance function $d(x, y)$.

$$P(E_k|H) = 1 - d(UserAns[k], OurAns[k])$$
$$
P(E_k|H) = 1 - d(A_k, Q_{k}^{(H)})
\space \space \space (7)
$$


## Computing $P(E_k|\neg{H})$
Same thing as above but the main difference is that we have to take into account all other possibilities.
$$
P(E_k
|¬H) = 1 − avgDist(OurAnsGivenNot\_{H}[k], UserAns[k])
$$
$$
P(E_k
|¬H) = 1 − \dfrac{1}{Card(C\setminus H)}
\sum_{X \in {C \setminus H}}{d(A_k, Q_{k}^{(X)})}
\space \space \space (8)
$$

## Finally..
From $(1)$, $(2)$, $(6)$, $(7)$ and $(8)$ we have,
$$
P(H|E_1 \land E_2 \land .. \land E_N ) = 
\dfrac
    {
        \dfrac{1}{T}\prod_{k}^{} {[1 - d(A_k, Q_{k}^{(H)})]}
    }
    {
        \dfrac{1}{T}\prod_{k}^{} {[1 - d(A_k, Q_{k}^{(H)})]}
        +
        \biggl(1 - \dfrac{1}{T}\biggl)\prod_{k}^{} {[1 - D^{(\neg{H})} (k) )]}
    } 
\space \space \space (9)
$$

Read as "Probability of the hypothesis H given the evidences $E = E_1, E_2, .., E_N$".
- H: hypothesis $\equiv$ character
- $(E_i)_{(1 \leqslant i \leqslant  N)}$: obvervable evidence, defined implicitly by the user′s response
- $Q_{k}^{(H)}$: correct answer given H, a real number between 0 and 1.
- $d(x, y) := |x -y|$ (normalized distance for all $x, y \in [0; 1]$)
- $
D^{(\neg{H})} (k) = 
\dfrac{1}{Card(C\setminus H)}
\sum_{X \in {C \setminus H}}{d(A_k, Q_{k}^{(X)})}
$
- $C$ : set of all characters

# Finding the next optimal question
For our "AI" to look more "AI-ish", we have to solve this optimization problem: 

"Maximize the hypothesis’s probability the quickiest possible." i.e. "Ask the fewest number of question as possible"

First of all, how are we going to quantify information?
We have Information Theory for backing us up!

$$ probability = 1 / 2^{n\_bits\_of\_information}$$
$$ p = \dfrac{1}{2^{I}}$$

For example if $p = \dfrac{1}{2}$ then it is worth **1 bit** of information (I = 1): 50% one thing and 50% something else which is analoguous to the fact that a random bit has 50% chance to be either 0 or 1.

The lower the probability the bigger the information value.

Here is an interesting example, almost 70% of the population has black hair whereas only 2% of the
population has red hair. If we were to ask the fewest possible questions on how a person looks like
then asking if the person in question has red hair will bring us much more information because **if so**
then congratulations! We have just reduced our search space to 2% of the population.

$$70\% = \dfrac{1}{2^{(I=0.51)}}$$

$$2\% = \dfrac{1}{2^{(I=5.64)}}$$

In the second case, we have reduced our search space to almost 1/50 of the initial size of the
population.

Let $I(Q)$ be the information worth of the question $Q$ in our database.

$$
P(Q) =  \dfrac{1}{2^{I(Q)}} \rarr I(Q) = -log_2 P(Q)
$$

$P(Q)$ is a quantity that tells us how likely a character in our knowledge base corresponds.
Let’s try to approximate this value with the few things we have at hand.
Let $Poss(Q)$ be the set that contains all characters corresponding to $P(Q)$.

$$
Poss(Q) = \{X \in C \space | \space prob(Q^{(X)}) > 1/2 \} (Q \in SetQ)
$$

Which can be read as “Any character $X$ with a probability greater than $0.5$ associated with question $Q$ (a Yes)”

In order to approximate $P(Q)$ we need to be a little bit more cautious.
We are looking for is a quantity that embeds P(Q) and also verifies:
$$ \sum_{Q \in SetQ} {P(Q)} = 1 $$

In our model, we shall use:
$$
P(Q) := \dfrac
    {Card(Poss(Q))}
    {\sum_{X\in SetQ}Card(Poss(X))}
$$
This quantity computes a proportion hence it is the perfect candidate.

First, let’s only consider the questions that correspond to at least **1** character.
$$
SetQ_{≥1} =\{Q \in SetQ | Poss(Q) \ne \empty \}
$$

$$
\forall Q \in SetQ_{≥1} \space\space I(Q) =-log_2 P(Q) = -log_2 \biggl(\dfrac
    {Card(Poss(Q))}
    {\sum_{X\in SetQ_{≥1}}Card(Poss(X))}\biggl)
$$

If $Poss(Q)$ is an empty set (a question that does not correspond to any character according to our
definition) then there is no point in asking such a question in practice because it informs nothing
useful to our set of characters.
