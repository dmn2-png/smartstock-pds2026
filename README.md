# **SmartStock — Sistema de Gerenciamento de Almoxarifados**

Docente: Leonardo Melo  
Discentes: Daniel Menezes Nascimento, Danilo Fernando Santos de Oliveira, Emmylly Lislley Lima Rocha, Hellen Renyelle Fernandes Silva, Letícia Ranilly dos Santos Nascimento, Maria Clara Neco da Silva

## **1\. Descrição do sistema**

O SmartStock é um sistema para gerenciamento de almoxarifados, com o objetivo de auxiliar no controle dos itens armazenados e de suas movimentações.

O sistema busca reduzir perdas e pequenos furtos através do registro de entradas e saídas, permitindo identificar o funcionário responsável por cada movimentação.

---

## **2\. Requisitos do sistema**

### **Requisitos Funcionais**

* **RF01** – Cadastrar, alterar e excluir funcionários.  
* **RF02** – Cadastrar, alterar e excluir itens.  
* **RF03** – Cadastrar e organizar categorias.  
* **RF04** – Realizar login no sistema.  
* **RF05** – Registrar entrada de itens.  
* **RF06** – Registrar saída de itens.  
* **RF07** – Consultar itens disponíveis.  
* **RF08** – Consultar histórico de movimentações.

### **Requisitos Não Funcionais**

* **RNF01** – O sistema deverá utilizar banco de dados.  
* **RNF02** – Os usuários deverão acessar o sistema através de login e senha.  
* **RNF03** – A interface deverá ser simples e de fácil utilização.  
* **RNF04** \- O sistema deverá utilizar verificação de integridade das credenciais por JWT (JSON Web Token).

---

## 

## 

## **3\. Casos de Uso**

### **UC001 – Fazer login**

**Descrição:** O funcionário entra no sistema usando seu login e senha.  
**Requisitos:** RF04.  
**Ator:** Funcionário; Gerente.  
**Pré-condição:** Funcionário ou gerente cadastrado no sistema.  
**Pós-condição:** Usuário autenticado no sistema.

**Fluxo principal:**

1. O usuário solicita acesso ao sistema.  
2. O sistema apresenta a tela de login.  
3. O usuário informa seu login e senha. **\[UC001.FS001\]**  
4. O sistema verifica as informações.  
5. O sistema permite o acesso do usuário.

**Fluxos alternativos:**

**\[UC001.FS001\] – Login e/ou senha incorretos**

1. O usuário informa login e senha.  
2. O sistema verifica os dados informados.  
3. O sistema constata que o usuário existe, mas os dados inseridos estão incorretos.  
4. O sistema não permite o login.  
5. O sistema limpa os campos utilizados para a digitação.  
6. O sistema apresenta uma mensagem de erro e instrui o usuário a tentar novamente.  
   ---

   ### **UC002 – Cadastrar item**

**Descrição:** O usuário cadastra um novo item no estoque.  
**Requisitos:** RF02.  
**Ator:** Funcionário; Gerente.  
**Pré-condição:** Usuário autenticado no sistema.  
**Pós-condição:** Item cadastrado no sistema.

**Fluxo principal:**

1. O usuário solicita o cadastro de um item.  
2. O sistema apresenta a tela de cadastro.  
3. O usuário informa os dados do item. **\[UC002.FS001\]**  
4. O sistema verifica as informações.  
5. O sistema cadastra o item no sistema.

**Fluxos alternativos:**

**\[UC002.FS001\] – Dados inválidos ou incompletos**

1. O usuário informa os dados do item.  
2. O sistema verifica os dados informados.  
3. O sistema identifica que existem dados inválidos ou não preenchidos.  
4. O sistema não realiza o cadastro.  
5. O sistema apresenta uma mensagem de erro e solicita a correção dos dados.  
   ---

   ### **UC003 – Registrar entrada**

**Descrição:** O usuário registra a entrada de um item no estoque.  
**Requisitos:** RF05.  
**Ator:** Funcionário; Gerente.  
**Pré-condição:** Usuário autenticado e item cadastrado no sistema.  
**Pós-condição:** Entrada registrada e quantidade do item atualizada.

**Fluxo principal:**

1. O usuário solicita o registro de uma entrada.  
2. O sistema apresenta os itens cadastrados.  
3. O usuário seleciona o item e informa a quantidade. **\[UC003.FS001\]**  
4. O sistema verifica as informações.  
5. O sistema registra a entrada.  
6. O sistema atualiza a quantidade disponível do item.

**Fluxos alternativos:**

**\[UC003.FS001\] – Quantidade inválida**

1. O usuário seleciona o item e informa a quantidade.  
2. O sistema verifica a quantidade informada.  
3. O sistema identifica que a quantidade é inválida.  
4. O sistema não registra a entrada.  
5. O sistema apresenta uma mensagem de erro e solicita uma nova quantidade.  
   ---

   ### **UC004 – Registrar saída**

**Descrição:** O usuário registra a saída de um item do estoque.  
**Requisitos:** RF06.  
**Ator:** Funcionário; Gerente.  
**Pré-condição:** Usuário autenticado e item disponível no estoque.  
**Pós-condição:** Saída registrada e quantidade do item atualizada.

**Fluxo principal:**

1. O usuário solicita o registro de uma saída.  
2. O sistema apresenta os itens disponíveis.  
3. O usuário seleciona o item e informa a quantidade. **\[UC004.FS001\]**  
4. O sistema verifica a quantidade disponível.  
5. O sistema registra o responsável pela retirada.  
6. O sistema registra a saída.  
7. O sistema atualiza a quantidade disponível do item.

**Fluxos alternativos:**

**\[UC004.FS001\] – Quantidade maior que o estoque disponível**

1. O usuário seleciona o item e informa a quantidade.  
2. O sistema verifica a quantidade disponível.  
3. O sistema constata que a quantidade solicitada é maior que a disponível.  
4. O sistema não registra a saída.  
5. O sistema apresenta uma mensagem informando que a quantidade disponível é insuficiente.  
6. O sistema solicita que o usuário informe uma nova quantidade.  
   ---

   ### **UC005 – Consultar estoque**

**Descrição:** O usuário consulta os itens disponíveis no estoque.  
**Requisitos:** RF07.  
**Ator:** Funcionário; Gerente.  
**Pré-condição:** Usuário autenticado no sistema.  
**Pós-condição:** Informações do estoque apresentadas ao usuário.

**Fluxo principal:**

1. O usuário solicita a consulta do estoque.  
2. O sistema apresenta os itens cadastrados.  
3. O usuário pode pesquisar um item ou categoria. **\[UC005.FS001\]**  
4. O sistema realiza a busca.  
5. O sistema apresenta os resultados encontrados.

**Fluxos alternativos:**

**\[UC005.FS001\] – Item não encontrado**

1. O usuário informa o item ou categoria que deseja pesquisar.  
2. O sistema realiza a busca.  
3. O sistema não encontra nenhum resultado correspondente.  
4. O sistema apresenta uma mensagem informando que nenhum item foi encontrado.  
5. O usuário pode realizar uma nova pesquisa.  
   ---

   ### **UC006 – Consultar histórico**

**Descrição:** O usuário consulta o histórico de movimentações do estoque.  
**Requisitos:** RF08.  
**Ator:** Funcionário; Gerente.  
**Pré-condição:** Usuário autenticado no sistema.  
**Pós-condição:** Histórico de movimentações apresentado ao usuário.

**Fluxo principal:**

1. O usuário solicita a consulta do histórico.  
2. O sistema apresenta as movimentações registradas.  
3. O usuário seleciona uma movimentação para consultar seus detalhes. **\[UC006.FS001\]**  
4. O sistema apresenta o item, quantidade, tipo de movimentação, responsável e data.  
5. O usuário finaliza a consulta.

**Fluxos alternativos:**

**\[UC006.FS001\] – Nenhuma movimentação encontrada**

1. O usuário solicita a consulta do histórico.  
2. O sistema verifica as movimentações registradas.  
3. O sistema constata que não existem movimentações cadastradas.  
4. O sistema apresenta uma mensagem informando que não há movimentações registradas.  
   ---

   ### **UC007 – Cadastrar funcionário**

**Descrição:** O gerente cadastra um novo funcionário no sistema.  
**Requisitos:** RF01.  
**Ator:** Gerente.  
**Pré-condição:** Gerente autenticado no sistema.  
**Pós-condição:** Funcionário cadastrado no sistema.

**Fluxo principal:**

1. O gerente solicita o cadastro de um funcionário.  
2. O sistema apresenta a tela de cadastro.  
3. O gerente informa os dados do funcionário. **\[UC007.FS001\]**  
4. O sistema verifica as informações.  
5. O sistema cadastra o funcionário.

**Fluxos alternativos:**

**\[UC007.FS001\] – Dados inválidos ou incompletos**

1. O gerente informa os dados do funcionário.  
2. O sistema verifica os dados.  
3. O sistema identifica que existem dados inválidos ou não preenchidos.  
4. O sistema não realiza o cadastro.  
5. O sistema apresenta uma mensagem de erro e solicita a correção dos dados.  
   ---

   ### **UC008 – Alterar informações**

**Descrição:** O gerente altera informações de um item ou funcionário cadastrado.  
**Requisitos:** RF01; RF02.  
**Ator:** Gerente.  
**Pré-condição:** Gerente autenticado e registro cadastrado no sistema.  
**Pós-condição:** Informações do registro atualizadas.

**Fluxo principal:**

1. O gerente solicita a alteração de informações.  
2. O sistema apresenta os registros cadastrados.  
3. O gerente seleciona o registro que deseja alterar.  
4. O gerente modifica as informações necessárias. **\[UC008.FS001\]**  
5. O sistema verifica as informações.  
6. O sistema salva as alterações.

**Fluxos alternativos:**

**\[UC008.FS001\] – Dados inválidos**

1. O gerente altera as informações do registro.  
2. O sistema verifica os dados informados.  
3. O sistema identifica que existem dados inválidos.  
4. O sistema não salva as alterações.  
5. O sistema apresenta uma mensagem de erro e solicita a correção dos dados.  
   ---

   ### **UC009 – Excluir item**

**Descrição:** O gerente exclui um item cadastrado no sistema.  
**Requisitos:** RF02.  
**Ator:** Gerente.  
**Pré-condição:** Gerente autenticado e item cadastrado no sistema.  
**Pós-condição:** Item excluído do cadastro do sistema.

**Fluxo principal:**

1. O gerente solicita a exclusão de um item.  
2. O sistema apresenta os itens cadastrados.  
3. O gerente seleciona o item que deseja excluir.  
4. O sistema solicita a confirmação da exclusão. **\[UC009.FS001\]**  
5. O gerente confirma a exclusão.  
6. O sistema exclui o item.

**Fluxos alternativos:**

**\[UC009.FS001\] – Cancelamento da exclusão**

1. O sistema solicita a confirmação da exclusão.  
2. O gerente cancela a operação.  
3. O sistema não exclui o item.  
4. O sistema retorna para a tela anterior.  
* 

---

## **4\. Banco de Dados**

Tabelas principais:

* **Funcionário**  
* **Item**  
* **Categoria**  
* **Movimentação**

A tabela **Movimentação** registra:

* Item movimentado  
* Quantidade  
* Tipo de movimentação (entrada/saída)  
* Funcionário responsável  
* Data e horário

---

## **5\. Funcionamento básico**

**Login → Menu principal → Escolher operação**

* Cadastrar item  
* Consultar estoque  
* Registrar entrada  
* Registrar saída  
* Consultar histórico

Nas saídas, serão registradas quem realizou a operação, a data e hora, e a quantidade do produto apresentado.
